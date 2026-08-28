"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, DollarSign, Sparkles, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface SetPaymentPreferenceModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SetPaymentPreferenceModal({
  booking,
  isOpen,
  onClose,
  onSuccess,
}: SetPaymentPreferenceModalProps) {
  const queryClient = useQueryClient();

  const [ruleType, setRuleType] = useState<string>("BEFORE_SERVICE_DAYS");
  const [daysOffset, setDaysOffset] = useState<number>(7);
  const [previewDueDate, setPreviewDueDate] = useState<string | null>(null);

  // Real-time preview calculation before save
  useEffect(() => {
    if (booking?.id && isOpen) {
      fetch(`/api/service-bookings/${booking.id}/apply-payment-rule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule_type: ruleType,
          days_offset: daysOffset,
          commit: false,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.formatted_due_date) {
            setPreviewDueDate(data.formatted_due_date);
          }
        })
        .catch(console.error);
    }
  }, [booking?.id, ruleType, daysOffset, isOpen]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/service-bookings/${booking.id}/apply-payment-rule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule_type: ruleType,
          days_offset: daysOffset,
          commit: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set payment preference");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["hotel-checkins"] });
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Set Payment Preference Rule
          </DialogTitle>
          <DialogDescription className="text-xs">
            Configure automated supplier payment due dates. Sembark calculates the exact date before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target Service Info */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="font-semibold text-slate-800">{booking.service_name}</div>
            <div className="text-slate-500 font-mono text-[11px]">
              Trip: {booking.trip_display_id || booking.trip?.trip_display_id} • Cost: ${Number(booking.cost_price || 0).toLocaleString()}
            </div>
          </div>

          {/* Rule Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Payment Condition</Label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md font-medium"
            >
              <option value="BEFORE_SERVICE_DAYS">Days Before Service Date / Check-In</option>
              <option value="AFTER_SERVICE_DAYS">Days After Service Date / Check-Out</option>
              <option value="MONTH_END_PLUS_DAYS">Days After Month-End of Service End</option>
              <option value="IMMEDIATE">Immediate (Upon Confirmation)</option>
            </select>
          </div>

          {ruleType !== "IMMEDIATE" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {ruleType === "BEFORE_SERVICE_DAYS"
                  ? "Number of Days Prior"
                  : ruleType === "AFTER_SERVICE_DAYS"
                  ? "Number of Days Post-Service"
                  : "Days After Month-End"}
              </Label>
              <Input
                type="number"
                min={0}
                value={daysOffset}
                onChange={(e) => setDaysOffset(parseInt(e.target.value, 10) || 0)}
                className="h-8 text-xs font-mono"
              />
            </div>
          )}

          {/* Live Calculated Preview Banner */}
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                Calculated Payment Due Date
              </div>
              <div className="text-sm font-mono font-extrabold text-indigo-950">
                {previewDueDate ? `Due on: ${previewDueDate}` : "Calculating..."}
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="bg-slate-900 hover:bg-slate-800 text-white h-8 text-xs gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {saveMutation.isPending ? "Saving..." : "Confirm & Save Due Date"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
