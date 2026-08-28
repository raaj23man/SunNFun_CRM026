"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Users, CheckCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SalesStatsCard() {
  const [dateRange, setDateRange] = useState<"today" | "week" | "month">("month");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?dateRange=${dateRange}`);
      if (!res.ok) throw new Error("Failed to load sales stats");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const revenueList = data?.revenue || [];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Trip Sales &amp; Revenue
          </CardTitle>
          <span className="text-[11px] text-slate-500">
            Multi-currency confirmed revenue &amp; conversion metrics
          </span>
        </div>

        {/* Today / Week / Month toggle */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDateRange("today")}
            className={`h-7 px-2.5 text-[11px] rounded-md ${
              dateRange === "today" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
            }`}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDateRange("week")}
            className={`h-7 px-2.5 text-[11px] rounded-md ${
              dateRange === "week" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
            }`}
          >
            Week
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDateRange("month")}
            className={`h-7 px-2.5 text-[11px] rounded-md ${
              dateRange === "month" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
            }`}
          >
            Month
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Multi-currency revenue side-by-side (Never summed across currencies) */}
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">
            Confirmed Revenue:
          </div>
          {isLoading ? (
            <div className="h-12 bg-slate-50 animate-pulse rounded-lg" />
          ) : revenueList.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-dashed rounded-lg text-xs text-slate-400 text-center">
              No confirmed bookings in this period.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {revenueList.map((rev: any) => (
                <div
                  key={rev.currency}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1"
                >
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {rev.currency}
                  </div>
                  <div className="text-base font-mono font-bold text-slate-900 truncate">
                    {rev.currency === "USD"
                      ? `$ ${rev.amount.toLocaleString()}`
                      : rev.currency === "NPR"
                      ? `रू ${rev.amount.toLocaleString()}`
                      : rev.currency === "INR"
                      ? `₹ ${rev.amount.toLocaleString()}`
                      : `${rev.amount.toLocaleString()} ${rev.currency}`}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {rev.bookingsCount} {rev.bookingsCount === 1 ? "booking" : "bookings"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lead Counts by Funnel Stage */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
          <div className="p-2 bg-blue-50/60 border border-blue-100 rounded-lg">
            <div className="text-xs font-bold text-blue-900">{data?.totalLeads ?? 0}</div>
            <div className="text-[10px] text-blue-600 font-medium">Total Leads</div>
          </div>
          <div className="p-2 bg-amber-50/60 border border-amber-100 rounded-lg">
            <div className="text-xs font-bold text-amber-900">{data?.inProgress ?? 0}</div>
            <div className="text-[10px] text-amber-600 font-medium">In Progress</div>
          </div>
          <div className="p-2 bg-emerald-50/60 border border-emerald-100 rounded-lg">
            <div className="text-xs font-bold text-emerald-900">{data?.converted ?? 0}</div>
            <div className="text-[10px] text-emerald-600 font-medium">Converted</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
