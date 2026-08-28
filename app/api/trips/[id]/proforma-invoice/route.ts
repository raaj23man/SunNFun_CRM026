import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { ProformaInvoiceStatus } from "@prisma/client";
import { addDays, format } from "date-fns";

/**
 * POST /api/trips/[id]/proforma-invoice
 * Generates a Proforma Invoice from an accepted tour quote,
 * auto-filling billing details with categorized line items (Hotel, Land, Activity, Flights).
 */
export const POST = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const tripId = (params?.id as string) || "";

    const trip = (await scopedPrisma.trip.findUnique({
      where: { id: tripId },
      include: {
        guest: true,
        trip_source: true,
        organization: {
          include: {
            billing_addresses: { where: { is_primary: true } },
            bank_accounts: true,
          },
        },
        quotes: {
          orderBy: { version: "desc" },
          include: {
            options: {
              where: { is_default: true },
              include: {
                days: {
                  include: { items: true },
                },
              },
            },
            flight_segments: true,
          },
        },
      },
    })) as any;

    if (!trip || trip.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const latestQuote = trip.quotes?.[0];
    const defaultOption = latestQuote?.options?.[0];

    // Categorized Line Items
    const lineItems: Array<{
      category: "HOTEL" | "TRANSPORT" | "ACTIVITY" | "FLIGHT" | "PACKAGE";
      description: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }> = [];

    let totalAmount = 0;

    if (defaultOption && defaultOption.days) {
      for (const day of defaultOption.days) {
        for (const item of day.items || []) {
          const itemTotal = Number(item.selling_price || item.cost_price || 0);
          totalAmount += itemTotal;
          lineItems.push({
            category: (item.item_type as any) || "HOTEL",
            description: `Day ${day.day_number}: ${item.custom_name}`,
            quantity: 1,
            unit_price: itemTotal,
            total_price: itemTotal,
          });
        }
      }
    } else {
      const packageAmt = Number(trip.package_amount || 0);
      totalAmount = packageAmt;
      lineItems.push({
        category: "PACKAGE",
        description: `Custom Tour Package (${trip.duration_days}D/${trip.duration_nights}N)`,
        quantity: 1,
        unit_price: packageAmt,
        total_price: packageAmt,
      });
    }

    const timestamp = Date.now().toString().slice(-4);
    const invoiceNumber = `PI-${trip.trip_display_id}-${timestamp}`;
    const dueDate = addDays(new Date(), 7);

    // Auto-filled buyer billing details
    const buyerBillingDetails = {
      billed_to_name: trip.trip_source?.name || trip.guest?.full_name || "Valued Client",
      contact_person: trip.trip_source?.contact_person || trip.guest?.full_name,
      email: trip.guest?.email,
      phone: trip.trip_source?.contact_person || trip.guest?.phone_number,
      tax_identifier: trip.trip_source?.billing_details || "N/A",
      address: "Kathmandu / International Client Address",
    };

    // Persist Proforma Invoice
    const invoice = await scopedPrisma.proformaInvoice.create({
      data: {
        organization_id: user.organization_id,
        trip_id: trip.id,
        quote_id: latestQuote?.id || null,
        invoice_number: invoiceNumber,
        buyer_billing_details: buyerBillingDetails,
        line_items: lineItems,
        amount: totalAmount,
        tax_amount: 0,
        currency: trip.currency || "USD",
        due_date: dueDate,
        status: ProformaInvoiceStatus.ISSUED,
        pdf_url: `/api/invoices/download?number=${invoiceNumber}`,
      },
    });

    // Write audit log
    await writeAuditLog(scopedPrisma, {
      organization_id: user.organization_id,
      actor_user_id: user.id,
      entity_type: "Quote" as any,
      entity_id: invoice.id,
      action: "CREATE",
      diff: { invoice_number: invoiceNumber, amount: totalAmount },
    });

    return NextResponse.json({
      success: true,
      invoice,
      message: `Proforma Invoice ${invoiceNumber} issued successfully.`,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "SALES_HEAD", "SALES_PERSON"],
  }
);
