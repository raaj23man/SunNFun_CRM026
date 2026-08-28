import { prisma } from "@/lib/prisma";
import { startOfToday, subYears } from "date-fns";
import { LedgerPaymentStatus, TripStatus } from "@prisma/client";

export interface CronMaintenanceResult {
  overdue_client_ledgers_count: number;
  overdue_supplier_ledgers_count: number;
  archived_trips_count: number;
  executed_at: string;
}

/**
 * Daily 01:00 Kathmandu-Time Cron Job:
 * 1. Scans ClientLedger / SupplierLedger and identifies OVERDUE accounts.
 * 2. Scans Trip records past the 1-year mark and flags them as is_archived = true.
 */
export async function runDailySystemMaintenance(
  dbClient: any = prisma
): Promise<CronMaintenanceResult> {
  const today = startOfToday();
  const oneYearAgo = subYears(new Date(), 1);

  // 1. Scan Overdue Client Receivables
  let overdueClientCount = 0;
  try {
    const overdueClients = await dbClient.clientLedger.findMany({
      where: {
        status: { in: [LedgerPaymentStatus.UNPAID, LedgerPaymentStatus.PARTIAL] },
        next_due_date: { lt: today },
      },
    });
    overdueClientCount = overdueClients.length;
  } catch (err) {
    console.warn("[Cron] ClientLedger scan warning:", err);
  }

  // 2. Scan Overdue Supplier Payables
  let overdueSupplierCount = 0;
  try {
    const overdueSuppliers = await dbClient.supplierLedger.findMany({
      where: {
        status: { in: [LedgerPaymentStatus.UNPAID, LedgerPaymentStatus.PARTIAL] },
        due_date: { lt: today },
      },
    });
    overdueSupplierCount = overdueSuppliers.length;
  } catch (err) {
    console.warn("[Cron] SupplierLedger scan warning:", err);
  }

  // 3. Scan & Archive Stale Trips (> 1 Year Old & Completed/Cancelled/Dropped)
  let archivedTripsCount = 0;
  try {
    const updateResult = await dbClient.trip.updateMany({
      where: {
        created_at: { lt: oneYearAgo },
        is_archived: false,
        status: { in: [TripStatus.COMPLETED, TripStatus.DROPPED, TripStatus.CANCELLED] },
      },
      data: {
        is_archived: true,
      },
    });
    archivedTripsCount = updateResult.count ?? (Array.isArray(updateResult) ? updateResult.length : 0);
  } catch (err) {
    console.warn("[Cron] Trip archival scan warning:", err);
  }

  return {
    overdue_client_ledgers_count: overdueClientCount,
    overdue_supplier_ledgers_count: overdueSupplierCount,
    archived_trips_count: archivedTripsCount,
    executed_at: new Date().toISOString(),
  };
}
