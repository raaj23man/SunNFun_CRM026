import { PrismaClient, PaymentMode, FinancialEntityType, LedgerPaymentStatus } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit-log";
import { ForbiddenError, NotFoundError, BadRequestError } from "@/lib/api-error";

export interface LogClientPaymentParams {
  organization_id: string;
  trip_id: string;
  client_ledger_id?: string;
  amount: number;
  payment_mode?: PaymentMode;
  reference_number?: string;
  remarks?: string;
  logged_by_user_id?: string;
  transaction_date?: Date;
  next_due_date?: Date | null;
  account_id?: string | null;
}

export interface LogSupplierPaymentParams {
  organization_id: string;
  service_booking_id: string;
  supplier_ledger_id?: string;
  supplier_id?: string;
  amount: number;
  payment_mode?: PaymentMode;
  reference_number?: string;
  remarks?: string;
  logged_by_user_id?: string;
  transaction_date?: Date;
  account_id?: string | null;
}

/**
 * Atomic client payment logger wrapped inside Prisma $transaction().
 * 1. Inserts FinancialTransaction
 * 2. Increments ClientLedger.total_paid_amount
 * 3. Flips status to PAID_IN_FULL or PARTIAL
 * 4. Logs Audit record
 */
export async function logClientPaymentTransaction(
  tx: any,
  params: LogClientPaymentParams
) {
  if (params.amount <= 0) {
    throw new BadRequestError("Payment amount must be greater than zero.");
  }

  // 1. Fetch or initialize ClientLedger
  let ledger = await tx.clientLedger.findFirst({
    where: {
      organization_id: params.organization_id,
      trip_id: params.trip_id,
    },
  });

  if (!ledger) {
    // If trip exists, initialize ledger
    const trip = await tx.trip.findUnique({ where: { id: params.trip_id } });
    if (!trip || trip.organization_id !== params.organization_id) {
      throw new NotFoundError("Trip not found");
    }

    ledger = await tx.clientLedger.create({
      data: {
        organization_id: params.organization_id,
        trip_id: params.trip_id,
        total_billed_amount: trip.package_amount || 0,
        total_paid_amount: 0,
        currency: trip.currency || "USD",
        status: LedgerPaymentStatus.UNPAID,
      },
    });
  }

  // 2. Insert FinancialTransaction
  const financialTx = await tx.financialTransaction.create({
    data: {
      organization_id: params.organization_id,
      entity_type: FinancialEntityType.CLIENT_PAYMENT,
      entity_id: ledger.id,
      trip_id: params.trip_id,
      client_ledger_id: ledger.id,
      account_id: params.account_id || null,
      amount: params.amount,
      currency: ledger.currency,
      payment_mode: params.payment_mode || PaymentMode.BANK_TRANSFER,
      reference_number: params.reference_number || null,
      remarks: params.remarks || null,
      logged_by_user_id: params.logged_by_user_id || null,
      transaction_date: params.transaction_date || new Date(),
      is_verified: false,
      is_refund: false,
      is_reverted: false,
    },
  });

  // 3. Update ClientLedger balance & status
  const currentPaid = Number(ledger.total_paid_amount) || 0;
  const newTotalPaid = currentPaid + params.amount;
  const totalBilled = Number(ledger.total_billed_amount) || 0;

  let newStatus: LedgerPaymentStatus = LedgerPaymentStatus.PARTIAL;
  if (newTotalPaid >= totalBilled && totalBilled > 0) {
    newStatus = LedgerPaymentStatus.PAID_IN_FULL;
  } else if (newTotalPaid <= 0) {
    newStatus = LedgerPaymentStatus.UNPAID;
  }

  const updatedLedger = await tx.clientLedger.update({
    where: { id: ledger.id },
    data: {
      total_paid_amount: newTotalPaid,
      status: newStatus,
      ...(params.next_due_date !== undefined && { next_due_date: params.next_due_date }),
    },
  });

  // 4. Audit Log
  await writeAuditLog(tx, {
    organization_id: params.organization_id,
    actor_user_id: params.logged_by_user_id || null,
    entity_type: "FinancialTransaction" as any,
    entity_id: financialTx.id,
    action: "CREATE",
    diff: {
      action: "LOG_CLIENT_PAYMENT",
      amount: params.amount,
      new_total_paid: newTotalPaid,
      new_status: newStatus,
    },
  });

  return {
    transaction: financialTx,
    ledger: updatedLedger,
  };
}

/**
 * Atomic supplier payment logger wrapped inside Prisma $transaction().
 * 1. Inserts FinancialTransaction
 * 2. Increments SupplierLedger.total_paid_amount & ServiceBooking.amount_paid
 * 3. Flips status to PAID_IN_FULL or PARTIAL
 */
export async function logSupplierPaymentTransaction(
  tx: any,
  params: LogSupplierPaymentParams
) {
  if (params.amount <= 0) {
    throw new BadRequestError("Payment amount must be greater than zero.");
  }

  const booking = await tx.serviceBooking.findUnique({
    where: { id: params.service_booking_id },
  });

  if (!booking || booking.organization_id !== params.organization_id) {
    throw new NotFoundError("Service booking not found");
  }

  // 1. Fetch or initialize SupplierLedger
  let ledger = await tx.supplierLedger.findUnique({
    where: { service_booking_id: params.service_booking_id },
  });

  if (!ledger) {
    ledger = await tx.supplierLedger.create({
      data: {
        organization_id: params.organization_id,
        service_booking_id: params.service_booking_id,
        supplier_id: params.supplier_id || booking.supplier_id,
        trip_id: booking.trip_id,
        total_cost_amount: booking.cost_price,
        total_paid_amount: 0,
        currency: "USD",
        status: LedgerPaymentStatus.UNPAID,
      },
    });
  }

  // 2. Insert FinancialTransaction
  const financialTx = await tx.financialTransaction.create({
    data: {
      organization_id: params.organization_id,
      entity_type: FinancialEntityType.SUPPLIER_PAYMENT,
      entity_id: ledger.id,
      trip_id: booking.trip_id,
      service_booking_id: params.service_booking_id,
      supplier_ledger_id: ledger.id,
      account_id: params.account_id || null,
      amount: params.amount,
      currency: ledger.currency,
      payment_mode: params.payment_mode || PaymentMode.BANK_TRANSFER,
      reference_number: params.reference_number || null,
      remarks: params.remarks || null,
      logged_by_user_id: params.logged_by_user_id || null,
      transaction_date: params.transaction_date || new Date(),
      is_verified: true, // Outgoing supplier payouts logged directly
      is_refund: false,
      is_reverted: false,
    },
  });

  // 3. Update SupplierLedger balance & status
  const currentPaid = Number(ledger.total_paid_amount) || 0;
  const newTotalPaid = currentPaid + params.amount;
  const totalCost = Number(ledger.total_cost_amount) || 0;

  let newStatus: LedgerPaymentStatus = LedgerPaymentStatus.PARTIAL;
  if (newTotalPaid >= totalCost && totalCost > 0) {
    newStatus = LedgerPaymentStatus.PAID_IN_FULL;
  } else if (newTotalPaid <= 0) {
    newStatus = LedgerPaymentStatus.UNPAID;
  }

  const updatedLedger = await tx.supplierLedger.update({
    where: { id: ledger.id },
    data: {
      total_paid_amount: newTotalPaid,
      status: newStatus,
    },
  });

  // 4. Update ServiceBooking amount_paid
  await tx.serviceBooking.update({
    where: { id: params.service_booking_id },
    data: { amount_paid: newTotalPaid },
  });

  // 5. Audit Log
  await writeAuditLog(tx, {
    organization_id: params.organization_id,
    actor_user_id: params.logged_by_user_id || null,
    entity_type: "FinancialTransaction" as any,
    entity_id: financialTx.id,
    action: "CREATE",
    diff: {
      action: "LOG_SUPPLIER_PAYMENT",
      amount: params.amount,
      new_total_paid: newTotalPaid,
      new_status: newStatus,
    },
  });

  return {
    transaction: financialTx,
    ledger: updatedLedger,
  };
}

/**
 * Reverts a financial transaction with server-side locked-trip guard.
 */
export async function revertFinancialTransaction(
  tx: any,
  params: {
    organization_id: string;
    transaction_id: string;
    user_id?: string;
    reason?: string;
  }
) {
  const transaction = await tx.financialTransaction.findUnique({
    where: { id: params.transaction_id },
    include: { trip: true, client_ledger: true, supplier_ledger: true },
  });

  if (!transaction || transaction.organization_id !== params.organization_id) {
    throw new NotFoundError("Financial transaction not found");
  }

  if (transaction.is_reverted) {
    throw new BadRequestError("This transaction has already been reverted.");
  }

  // LOCKED TRIP GUARD (PRD Part 6 Technical Constraint):
  // Revert is blocked if trip is locked server-side, regardless of UI.
  if (transaction.trip?.is_locked) {
    throw new ForbiddenError(
      "Cannot revert transaction: The associated trip is locked. An Administrator must unlock the trip before financial adjustments can be made."
    );
  }

  // 1. Mark transaction as reverted
  const revertedTx = await tx.financialTransaction.update({
    where: { id: params.transaction_id },
    data: {
      is_reverted: true,
      reverted_at: new Date(),
      remarks: params.reason
        ? `${transaction.remarks || ""} [REVERTED: ${params.reason}]`
        : `${transaction.remarks || ""} [REVERTED]`,
    },
  });

  // 2. Decrement ledger total_paid_amount
  const amount = Number(transaction.amount) || 0;

  if (transaction.client_ledger_id && transaction.client_ledger) {
    const currentPaid = Number(transaction.client_ledger.total_paid_amount) || 0;
    const newPaid = Math.max(0, currentPaid - amount);
    const totalBilled = Number(transaction.client_ledger.total_billed_amount) || 0;

    let newStatus: LedgerPaymentStatus = LedgerPaymentStatus.UNPAID;
    if (newPaid >= totalBilled && totalBilled > 0) {
      newStatus = LedgerPaymentStatus.PAID_IN_FULL;
    } else if (newPaid > 0) {
      newStatus = LedgerPaymentStatus.PARTIAL;
    }

    await tx.clientLedger.update({
      where: { id: transaction.client_ledger_id },
      data: {
        total_paid_amount: newPaid,
        status: newStatus,
      },
    });
  }

  if (transaction.supplier_ledger_id && transaction.supplier_ledger) {
    const currentPaid = Number(transaction.supplier_ledger.total_paid_amount) || 0;
    const newPaid = Math.max(0, currentPaid - amount);
    const totalCost = Number(transaction.supplier_ledger.total_cost_amount) || 0;

    let newStatus: LedgerPaymentStatus = LedgerPaymentStatus.UNPAID;
    if (newPaid >= totalCost && totalCost > 0) {
      newStatus = LedgerPaymentStatus.PAID_IN_FULL;
    } else if (newPaid > 0) {
      newStatus = LedgerPaymentStatus.PARTIAL;
    }

    await tx.supplierLedger.update({
      where: { id: transaction.supplier_ledger_id },
      data: {
        total_paid_amount: newPaid,
        status: newStatus,
      },
    });

    if (transaction.service_booking_id) {
      await tx.serviceBooking.update({
        where: { id: transaction.service_booking_id },
        data: { amount_paid: newPaid },
      });
    }
  }

  // 3. Audit Log
  await writeAuditLog(tx, {
    organization_id: params.organization_id,
    actor_user_id: params.user_id || null,
    entity_type: "FinancialTransaction" as any,
    entity_id: transaction.id,
    action: "STATUS_CHANGE",
    diff: {
      action: "REVERT_PAYMENT",
      amount,
      reason: params.reason,
    },
  });

  return revertedTx;
}

/**
 * Completes Part 5 Drop-Triggered Automatic Refund Installment in Part 6 Ledgers.
 */
export async function processDropRefundInstallment(
  tx: any,
  params: {
    organization_id: string;
    trip_id: string;
    service_booking_id: string;
    refund_amount: number;
    user_id?: string;
    service_name: string;
  }
) {
  if (params.refund_amount <= 0) return null;

  // Fetch or initialize client ledger
  let ledger = await tx.clientLedger.findFirst({
    where: {
      organization_id: params.organization_id,
      trip_id: params.trip_id,
    },
  });

  if (!ledger) {
    ledger = await tx.clientLedger.create({
      data: {
        organization_id: params.organization_id,
        trip_id: params.trip_id,
        total_billed_amount: 0,
        total_paid_amount: 0,
        currency: "USD",
        status: LedgerPaymentStatus.REFUND_DUE,
      },
    });
  } else {
    await tx.clientLedger.update({
      where: { id: ledger.id },
      data: { status: LedgerPaymentStatus.REFUND_DUE },
    });
  }

  // Insert refund transaction record
  const refundTx = await tx.financialTransaction.create({
    data: {
      organization_id: params.organization_id,
      entity_type: FinancialEntityType.CLIENT_PAYMENT,
      entity_id: ledger.id,
      trip_id: params.trip_id,
      service_booking_id: params.service_booking_id,
      client_ledger_id: ledger.id,
      amount: params.refund_amount,
      currency: ledger.currency,
      payment_mode: PaymentMode.BANK_TRANSFER,
      reference_number: `AUTO-REFUND-DROP-${Date.now().toString().slice(-6)}`,
      remarks: `[Auto Refund Installment] Service Dropped: ${params.service_name}`,
      logged_by_user_id: params.user_id || null,
      is_verified: false,
      is_refund: true,
    },
  });

  await writeAuditLog(tx, {
    organization_id: params.organization_id,
    actor_user_id: params.user_id || null,
    entity_type: "FinancialTransaction" as any,
    entity_id: refundTx.id,
    action: "CREATE",
    diff: {
      action: "AUTO_REFUND_INSTALLMENT_POSTED",
      refund_amount: params.refund_amount,
      service_booking_id: params.service_booking_id,
    },
  });

  return refundTx;
}
