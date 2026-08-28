"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PendingFollowUpsCard() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"today" | "overdue" | "upcoming">("today");

  const { data: statsData } = useQuery({
    queryKey: ["dashboard-stats", "month"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats?dateRange=month");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
  });

  const followUpCounts = statsData?.followUps || { today: 0, overdue: 0, next7Days: 0 };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Pending Follow-ups
          </CardTitle>
          <span className="text-[11px] text-slate-500">
            Never miss a promised client reminder
          </span>
        </div>

        {/* Tab pills with count badges */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTab("today")}
            className={`h-7 px-2.5 text-[11px] rounded-md gap-1.5 ${
              tab === "today" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
            }`}
          >
            Today
            <span className="text-[10px] bg-slate-200 px-1 rounded-full">
              {followUpCounts.today}
            </span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTab("overdue")}
            className={`h-7 px-2.5 text-[11px] rounded-md gap-1.5 ${
              tab === "overdue" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
            }`}
          >
            Overdue
            <span
              className={`text-[10px] px-1 rounded-full ${
                followUpCounts.overdue > 0
                  ? "bg-red-500 text-white font-bold animate-pulse"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {followUpCounts.overdue}
            </span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTab("upcoming")}
            className={`h-7 px-2.5 text-[11px] rounded-md gap-1.5 ${
              tab === "upcoming" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
            }`}
          >
            Next 7D
            <span className="text-[10px] bg-slate-200 px-1 rounded-full">
              {followUpCounts.next7Days}
            </span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-2">
          <div className="text-xs text-slate-600">
            {tab === "today" && (
              <span>You have <strong>{followUpCounts.today}</strong> follow-ups scheduled for today.</span>
            )}
            {tab === "overdue" && (
              <span className={followUpCounts.overdue > 0 ? "text-red-700 font-semibold" : ""}>
                {followUpCounts.overdue > 0
                  ? `Attention: ${followUpCounts.overdue} follow-ups are overdue and require immediate action!`
                  : "No overdue follow-ups. Great job staying on top of leads!"}
              </span>
            )}
            {tab === "upcoming" && (
              <span>You have <strong>{followUpCounts.next7Days}</strong> follow-ups due in the next 7 days.</span>
            )}
          </div>

          <Link href="/trips">
            <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 mt-2 bg-white">
              Open Lead Pipeline
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
