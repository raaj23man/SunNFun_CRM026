"use client";

import React, { useState } from "react";
import { formatDistanceToNowStrict, isPast, isToday, parseISO } from "date-fns";
import { DollarSign, Download, CreditCard, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogPaymentModal } from "./LogPaymentModal";

interface IncomingPaymentsTableProps {
  ledgers: any[];
  filter: string;
  onFilterChange: (newFilter: string) => void;
  isLoading: boolean;
}

export function IncomingPaymentsTable({
  ledgers,
  filter,
  onFilterChange,
  isLoading,
}: IncomingPaymentsTableProps) {
  const [selectedLedger, setSelectedLedger] = useState<any>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const filters = [
    { label: "All Receivables", key: "all" },
    { label: "Past 7 Days", key: "past7" },
    { label: "Today", key: "today" },
    { label: "Upcoming", key: "upcoming" },
    { label: "Overdue", key: "overdue" },
    { label: "Paid in Full", key: "paid" },
  ];

  const exportToCsv = () => {
    if (!ledgers || ledgers.length === 0) return;
    const headers = ["Trip ID", "Client Name", "Total Billed", "Total Paid", "Remaining Balance", "Due Date", "Status"];
    const rows = ledgers.map((l) => [
      l.trip?.trip_display_id || "N/A",
      `"${l.trip?.guest?.full_name || "Guest"}"`,
      l.total_billed_amount,
      l.total_paid_amount,
      Math.max(0, Number(l.total_billed_amount) - Number(l.total_paid_amount)),
      l.next_due_date ? l.next_due_date.slice(0, 10) : "N/A",
      l.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Client_Receivables_${filter}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  const renderDueDateBadge = (dateString?: string, status?: string) => {
    if (status === "PAID_IN_FULL") {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1">
          <CheckCircle2 className="w-3 h-3" /> Paid in Full
        </Badge>
      );
    }

    if (!dateString) {
      return <span className="text-slate-400 text-xs italic">No due date set</span>;
    }

    const date = parseISO(dateString);
    const distance = formatDistanceToNowStrict(date, { addSuffix: true });

    if (isToday(date)) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold">
          Due Today
        </Badge>
      );
    }

    if (isPast(date)) {
      return (
        <Badge variant="destructive" className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold gap-1">
          <AlertTriangle className="w-3 h-3" /> Overdue {distance}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-medium gap-1">
        <Clock className="w-3 h-3" /> Due {distance}
      </Badge>
    );
  };

  return (
    <div className="space-y-3">
      {/* Filter Tabs & Export */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-lg border border-slate-200">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                filter === f.key
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={exportToCsv}
          disabled={!ledgers || ledgers.length === 0}
          className="h-8 text-xs gap-1.5 border-slate-200"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV / Excel
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5">Trip Ref / Guest</th>
                <th className="px-3.5 py-2.5">Sales Agent</th>
                <th className="px-3.5 py-2.5">Total Billed</th>
                <th className="px-3.5 py-2.5">Total Collected</th>
                <th className="px-3.5 py-2.5">Balance Due</th>
                <th className="px-3.5 py-2.5">Due Date &amp; Status</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading receivables...
                  </td>
                </tr>
              ) : !ledgers || ledgers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No client payment records found matching filter &quot;{filter}&quot;.
                  </td>
                </tr>
              ) : (
                ledgers.map((ledger) => {
                  const billed = Number(ledger.total_billed_amount || 0);
                  const paid = Number(ledger.total_paid_amount || 0);
                  const balance = Math.max(0, billed - paid);

                  return (
                    <tr key={ledger.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-slate-900 font-mono">
                          {ledger.trip?.trip_display_id || "TRIP"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {ledger.trip?.guest?.full_name || "Direct Guest"}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600">
                        {ledger.trip?.assigned_user
                          ? `${ledger.trip.assigned_user.first_name} ${ledger.trip.assigned_user.last_name}`
                          : "Unassigned"}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-900 font-semibold">
                        ${billed.toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-emerald-700 font-semibold">
                        ${paid.toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-700">
                        ${balance.toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {renderDueDateBadge(ledger.next_due_date, ledger.status)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLedger(ledger);
                            setIsLogModalOpen(true);
                          }}
                          className="h-7 text-[11px] gap-1 border-slate-300 font-semibold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Log Payment
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Payment Modal */}
      {selectedLedger && (
        <LogPaymentModal
          ledger={selectedLedger}
          isOpen={isLogModalOpen}
          onClose={() => {
            setIsLogModalOpen(false);
            setSelectedLedger(null);
          }}
        />
      )}
    </div>
  );
}
