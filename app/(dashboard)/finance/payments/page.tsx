"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ArrowDownLeft, ArrowUpRight, ShieldCheck, RefreshCw } from "lucide-react";
import { IncomingPaymentsTable } from "@/components/finance/IncomingPaymentsTable";
import { Button } from "@/components/ui/button";

export default function FinancePaymentsPage() {
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");
  const [filter, setFilter] = useState<string>("all");

  const { data: incomingData, isLoading: incomingLoading, refetch: refetchIncoming } = useQuery({
    queryKey: ["incoming-finance", filter],
    queryFn: async () => {
      const res = await fetch(`/api/finance/incoming?filter=${filter}`);
      if (!res.ok) throw new Error("Failed to fetch client receivables");
      return res.json();
    },
    enabled: activeTab === "incoming",
  });

  const { data: outgoingData, isLoading: outgoingLoading, refetch: refetchOutgoing } = useQuery({
    queryKey: ["outgoing-finance", filter],
    queryFn: async () => {
      const res = await fetch(`/api/finance/outgoing?filter=${filter}`);
      if (!res.ok) throw new Error("Failed to fetch supplier payables");
      return res.json();
    },
    enabled: activeTab === "outgoing",
  });

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial Accounting &amp; Payments</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
              ACID Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time accounts receivable collections, supplier payables disbursements, and immutable ledger balance tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (activeTab === "incoming" ? refetchIncoming() : refetchOutgoing())}
            className="h-8 text-xs gap-1.5 border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Mode Tabs: Incoming (AR) vs Outgoing (AP) */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab("incoming");
            setFilter("all");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "incoming"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/40"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          Incoming Collections (Accounts Receivable)
        </button>

        <button
          onClick={() => {
            setActiveTab("outgoing");
            setFilter("all");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "outgoing"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/40"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-indigo-600" />
          Outgoing Disbursements (Accounts Payable)
        </button>
      </div>

      {/* View Content */}
      {activeTab === "incoming" ? (
        <IncomingPaymentsTable
          ledgers={incomingData?.ledgers || []}
          filter={filter}
          onFilterChange={setFilter}
          isLoading={incomingLoading}
        />
      ) : (
        <div className="p-8 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-lg">
          Supplier payables list populated from confirmed service bookings.
        </div>
      )}
    </div>
  );
}
