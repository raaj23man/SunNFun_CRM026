"use client";

import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Compass, Sparkles, Building2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { SalesStatsCard } from "@/components/dashboard/SalesStatsCard";
import { PendingFollowUpsCard } from "@/components/dashboard/PendingFollowUpsCard";
import { LiveTripsCard } from "@/components/dashboard/LiveTripsCard";
import { PlanRequestsInboxCard } from "@/components/dashboard/PlanRequestsInboxCard";
import { AddQueryModal } from "@/components/trips/AddQueryModal";

export default function DashboardHomePage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleQueryCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["trips"] });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Sales &amp; Operations Command</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
              Live Radar
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Welcome back, {user ? `${user.first_name} ${user.last_name}` : "Agent"} ({user?.role || "Staff"}). Here is today&apos;s lead pipeline and operational status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AddQueryModal onQueryCreated={handleQueryCreated} />
        </div>
      </div>

      {/* 4 Smart Dashboard Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Trip Sales Stats */}
        <SalesStatsCard />

        {/* Card 2: Pending Follow-ups */}
        <PendingFollowUpsCard />

        {/* Card 3: Live Trips (On-Trip Radar) */}
        <LiveTripsCard />

        {/* Card 4: Trip Plan Requests Inbox */}
        <PlanRequestsInboxCard />
      </div>
    </div>
  );
}
