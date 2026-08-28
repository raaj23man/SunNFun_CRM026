"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DollarSign, CreditCard, Calendar, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PaymentMode } from "@prisma/client";

interface LogPaymentModalProps {
  ledger: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LogPaymentModal({
  ledger,
  isOpen,
  onClose,
  onSuccess,
}: LogPaymentModalProps) {
  const queryClient = useQueryClient();

  const totalBilled = Number(ledger?.total_billed_amount || ledger?.total_cost_amount || 0);
  const totalPaid = Number(ledger?.total_paid_amount || 0);
  const remainingBalance = Math.max(0, totalBilled - totalPaid);

  const [amount, setAmount] = useState<string>(remainingBalance.toString());
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.BANK_TRANSFER);
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [updateDueDate, setUpdateDueDate] = useState<boolean>(false);
  const [nextDueDate, setNextDueDate] = useState<string>("");

  React.useEffect(() => {
    if (isOpen && ledger) {
      setAmount(remainingBalance.toString());
      setReferenceNumber("");
      setRemarks("");
      setUpdateDueDate(false);
    }
  }, [isOpen, ledger, remainingBalance]);

  const logPaymentMutation = useMutation({
    mutationFn: async () => {
      const endpoint = ledger.trip_id
        ? "/api/finance/transaction/client"
        : "/api/finance/transaction/supplier";

      const payload = ledger.trip_id
        ? {
            trip_id: ledger.trip_id,
            amount: parseFloat(amount) || 0,
            payment_mode: paymentMode,
            reference_number: referenceNumber || null,
            remarks: remarks || null,
            next_due_date: updateDueDate && nextDueDate ? nextDueDate : null,
          }
        : {
            service_booking_id: ledger.service_booking_id,
            amount: parseFloat(amount) || 0,
            payment_mode: paymentMode,
            reference_number: referenceNumber || null,
            remarks: remarks || null,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log payment");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incoming-finance"] });
      queryClient.invalidateQueries({ queryKey: ["outgoing-finance"] });
      queryClient.invalidateQueries({ queryKey: ["trip-details"] });
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  if (!ledger) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Log Collection / Payment Entry
          </DialogTitle>
          <DialogDescription className="text-xs">
            Records an immutable financial transaction and updates ledger balances atomically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* Balance Overview */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Billed</span>
              <div className="font-mono font-bold text-slate-900 mt-0.5">
                ${totalBilled.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Paid</span>
              <div className="font-mono font-bold text-emerald-700 mt-0.5">
                ${totalPaid.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Remaining</span>
              <div className="font-mono font-bold text-indigo-700 mt-0.5">
                ${remainingBalance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Amount & Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Payment Amount ($) *</Label>
              <Input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Payment Mode</Label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md"
              >
                <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
                <option value="CREDIT_CARD">Credit / Debit Card</option>
                <option value="CASH">Cash Drawer</option>
                <option value="PAYMENT_GATEWAY">Paddle Online Gateway</option>
                <option value="UPI">UPI / Instant QR</option>
              </select>
            </div>
          </div>

          {/* Reference & Remarks */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Transaction Reference / UTR Number</Label>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. HBL-WIRE-9928190"
              className="h-8 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Remarks &amp; Notes</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. 50% advance deposit received via direct transfer"
              className="h-8 text-xs"
            />
          </div>

          {/* Partial Payment Next Due Date Toggle */}
          <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="toggle-due-date" className="text-xs font-medium text-indigo-950 cursor-pointer">
                Update Next Due Date (For Partials)
              </Label>
              <Switch
                id="toggle-due-date"
                checked={updateDueDate}
                onCheckedChange={setUpdateDueDate}
              />
            </div>

            {updateDueDate && (
              <Input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="h-7 text-xs bg-white"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={logPaymentMutation.isPending || parseFloat(amount) <= 0}
            onClick={() => logPaymentMutation.mutate()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5 font-semibold"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {logPaymentMutation.isPending ? "Logging Transaction..." : "Confirm & Post Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
