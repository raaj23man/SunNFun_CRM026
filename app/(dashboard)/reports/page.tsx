"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, AlertTriangle, Download, DollarSign, Users, Award, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const [reportType, setReportType] = useState<"sales" | "profit">("profit");
  const [groupBy, setGroupBy] = useState<"agent" | "destination" | "source">("agent");

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["reports-sales", groupBy],
    queryFn: async () => {
      const res = await fetch(`/api/reports/sales?groupBy=${groupBy}`);
      if (!res.ok) throw new Error("Failed to fetch sales reports");
      return res.json();
    },
    enabled: reportType === "sales",
  });

  const { data: profitData, isLoading: profitLoading } = useQuery({
    queryKey: ["reports-profit"],
    queryFn: async () => {
      const res = await fetch("/api/reports/profit-checkout");
      if (!res.ok) throw new Error("Failed to fetch profit reports");
      return res.json();
    },
    enabled: reportType === "profit",
  });

  const exportCsv = () => {
    if (reportType === "sales" && salesData?.rows) {
      const headers = ["Group", "Total Leads", "Quotes", "Conversions", "Conversion Rate %", "Total Pax", "Revenue (USD)"];
      const rows = salesData.rows.map((r: any) => [
        `"${r.name}"`,
        r.total_leads,
        r.total_quotes,
        r.conversions,
        `${r.conversion_rate_percent}%`,
        r.total_pax,
        r.revenue_by_currency?.USD || 0,
      ]);
      const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      downloadBlob(csv, `Sales_Report_${groupBy}.csv`);
    } else if (reportType === "profit" && profitData?.rows) {
      const headers = ["Trip ID", "Guest", "Destination", "Selling Price", "Total Cost", "Gross Profit", "Margin %", "Status"];
      const rows = profitData.rows.map((r: any) => [
        r.trip_display_id,
        `"${r.guest_name}"`,
        `"${r.destination}"`,
        r.selling_price,
        r.total_cost,
        r.gross_profit,
        `${r.margin_percent}%`,
        r.has_pending_bookings ? "PENDING OPERATIONS" : "CONFIRMED",
      ]);
      const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      downloadBlob(csv, `Profit_Checkout_Report.csv`);
    }
  };

  const downloadBlob = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.click();
  };

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial &amp; Executive Reports</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded-full">
              Sembark Analytics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time profit checkout, lead conversion rates, and multi-currency revenue performance metrics.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          className="h-8 text-xs gap-1.5 border-slate-200"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV / Excel
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setReportType("profit")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            reportType === "profit"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/40"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          Trip Profit Checkout &amp; Margins
        </button>

        <button
          onClick={() => setReportType("sales")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            reportType === "sales"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/40"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          Lead &amp; Sales Conversion Analytics
        </button>
      </div>

      {/* Report Content */}
      {reportType === "profit" ? (
        <div className="space-y-4">
          {/* PENDING BOOKINGS WARNING BANNER (PRD Part 6 Technical Constraint) */}
          {profitData?.has_unconfirmed_operations && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-xs text-amber-900">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-950">
                  Notice: Operations Pending Confirmation
                </div>
                <div className="text-amber-800 text-[11px] mt-0.5">
                  {profitData.banner_warning}
                </div>
              </div>
            </div>
          )}

          {/* Profit Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5">Trip ID / Guest</th>
                    <th className="px-3.5 py-2.5">Destination</th>
                    <th className="px-3.5 py-2.5">Sales Rep</th>
                    <th className="px-3.5 py-2.5">Selling Price</th>
                    <th className="px-3.5 py-2.5">Supplier Cost</th>
                    <th className="px-3.5 py-2.5">Gross Profit</th>
                    <th className="px-3.5 py-2.5">Margin %</th>
                    <th className="px-3.5 py-2.5">Operations Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {profitLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Calculating profit checkout metrics...
                      </td>
                    </tr>
                  ) : !profitData?.rows || profitData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        No active tour records found.
                      </td>
                    </tr>
                  ) : (
                    profitData.rows.map((row: any) => (
                      <tr key={row.trip_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold font-mono text-slate-900">{row.trip_display_id}</div>
                          <div className="text-[11px] text-slate-500">{row.guest_name}</div>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600">{row.destination}</td>
                        <td className="px-3.5 py-2.5 text-slate-600">{row.agent_name}</td>
                        <td className="px-3.5 py-2.5 font-mono text-slate-900 font-semibold">
                          ${row.selling_price.toLocaleString()}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-slate-600 font-semibold">
                          ${row.total_cost.toLocaleString()}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-emerald-700">
                          ${row.gross_profit.toLocaleString()}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                          {row.margin_percent}%
                        </td>
                        <td className="px-3.5 py-2.5">
                          {row.has_pending_bookings ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {row.pending_count} Pending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              Confirmed
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Group By Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Group Conversions By:</span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md border border-slate-200">
              {(["agent", "destination", "source"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded capitalize transition-colors ${
                    groupBy === g ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Sales Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5 capitalize">{groupBy} Name</th>
                    <th className="px-3.5 py-2.5">Total Inquiries</th>
                    <th className="px-3.5 py-2.5">Quotes Generated</th>
                    <th className="px-3.5 py-2.5">Conversions</th>
                    <th className="px-3.5 py-2.5">Conversion %</th>
                    <th className="px-3.5 py-2.5">Total Passengers (Pax)</th>
                    <th className="px-3.5 py-2.5">Revenue (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {salesLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Loading sales performance statistics...
                      </td>
                    </tr>
                  ) : !salesData?.rows || salesData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No sales data found for this grouping.
                      </td>
                    </tr>
                  ) : (
                    salesData.rows.map((row: any) => (
                      <tr key={row.name} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">{row.name}</td>
                        <td className="px-3.5 py-2.5 text-slate-700">{row.total_leads}</td>
                        <td className="px-3.5 py-2.5 text-slate-700">{row.total_quotes}</td>
                        <td className="px-3.5 py-2.5 font-bold text-emerald-700">{row.conversions}</td>
                        <td className="px-3.5 py-2.5">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold text-[11px]">
                            {row.conversion_rate_percent}%
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-700">{row.total_pax}</td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                          ${(row.revenue_by_currency?.USD || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
