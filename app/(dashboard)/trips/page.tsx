"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Search,
  Phone,
  Calendar,
  Users,
  MapPin,
  Clock,
  AlertTriangle,
  Lock,
  Archive,
  ArrowRight,
  Filter,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AddQueryModal } from "@/components/trips/AddQueryModal";
import { TripStatus } from "@prisma/client";

const PIPELINE_TABS: { label: string; value: string }[] = [
  { label: "All Inquiries", value: "ALL" },
  { label: "New Query", value: "NEW_QUERY" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "On Hold", value: "ON_HOLD" },
  { label: "Converted", value: "CONVERTED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Dropped", value: "DROPPED" },
];

const statusBadgeStyles: Record<TripStatus, { label: string; className: string }> = {
  NEW_QUERY: { label: "New Query", className: "bg-blue-100 text-blue-800 border-blue-200" },
  IN_PROGRESS: { label: "In Progress", className: "bg-amber-100 text-amber-800 border-amber-200" },
  ON_HOLD: { label: "On Hold", className: "bg-purple-100 text-purple-800 border-purple-200" },
  CONVERTED: { label: "Converted", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  COMPLETED: { label: "Completed", className: "bg-slate-100 text-slate-800 border-slate-200" },
  CANCELLED: { label: "Cancelled", className: "bg-rose-100 text-rose-800 border-rose-200" },
  DROPPED: { label: "Dropped", className: "bg-red-100 text-red-900 border-red-200 font-bold" },
};

export default function TripsPipelinePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // TanStack React Query with 5-minute staleTime for instant tab switching
  const { data, isLoading } = useQuery({
    queryKey: ["trips", activeTab, searchTerm, showArchived],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.append("status", activeTab);
      if (searchTerm) params.append("search", searchTerm);
      if (showArchived) params.append("show_archived", "true");

      const res = await fetch(`/api/trips?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load trips");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes caching per Technical Constraints
  });

  const trips = data?.trips || [];

  const handleQueryCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["trips"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Leads &amp; Query Pipeline
          </h1>
          <p className="text-xs text-slate-500">
            Real-time pipeline of all client queries, itineraries, and booking stages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AddQueryModal onQueryCreated={handleQueryCreated} />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Guest Name, Phone (+977...), or Trip ID (SBC-10001)..."
            className="pl-9 h-9 text-xs bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Switch
              checked={showArchived}
              onCheckedChange={setShowArchived}
              id="show-archived"
            />
            <label htmlFor="show-archived" className="cursor-pointer select-none text-[11px]">
              Show Archived Trips
            </label>
          </div>
        </div>
      </div>

      {/* Horizontally scrollable status tabs */}
      <div className="overflow-x-auto pb-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg inline-flex min-w-full sm:min-w-0">
            {PIPELINE_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs font-semibold px-3 py-1.5 whitespace-nowrap"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Lead Cards List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading lead pipeline...</div>
        ) : trips.length === 0 ? (
          <div className="p-12 bg-white rounded-lg border border-dashed text-center text-xs text-slate-400 space-y-2">
            <div>No inquiries found in this status tab.</div>
            <AddQueryModal
              onQueryCreated={handleQueryCreated}
              triggerButton={
                <Button size="sm" variant="outline" className="text-xs">
                  Create First Lead
                </Button>
              }
            />
          </div>
        ) : (
          trips.map((trip: any) => {
            const statusMeta = statusBadgeStyles[trip.status as TripStatus] || {
              label: trip.status,
              className: "bg-slate-100 text-slate-800",
            };

            return (
              <Card
                key={trip.id}
                className={`border transition-all hover:shadow-sm ${
                  trip.has_stale_activity_warning
                    ? "border-amber-300 bg-amber-50/20"
                    : "border-slate-200 bg-white"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Trip ID + Guest + Contact */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-sm tracking-tight">
                          {trip.trip_display_id}
                        </span>

                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>

                        {trip.is_locked && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        )}

                        {trip.has_stale_activity_warning && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-semibold animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Stale (3+ days untouched)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 text-sm">
                          {trip.guest?.salutation ? `${trip.guest.salutation} ` : ""}
                          {trip.guest?.full_name}
                        </span>

                        {trip.guest?.is_repeat_traveler && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-1.5 py-0.5 rounded">
                            Repeat Traveler
                          </span>
                        )}

                        {/* Click-to-dial tel: link */}
                        {trip.guest?.phone_number && (
                          <a
                            href={`tel:${trip.guest.phone_number}`}
                            className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-mono font-medium hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {trip.guest.phone_number}
                          </a>
                        )}
                      </div>

                      {/* Config summary: Dates • 4N,5D • 4A,2C */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {trip.destination?.name || "Custom Destination"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(trip.start_date)}
                        </span>
                        <span>•</span>
                        <span>
                          {trip.duration_nights}N, {trip.duration_days}D
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          {trip.pax_adults}A{trip.pax_children > 0 ? `, ${trip.pax_children}C` : ""}
                        </span>
                      </div>
                    </div>

                    {/* Right: Tags & Action Link */}
                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {trip.tags && trip.tags.length > 0 && (
                        <div className="hidden sm:flex flex-wrap gap-1 max-w-xs">
                          {trip.tags.slice(0, 2).map((t: string, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <Link href={`/trips/${trip.id}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-white">
                          View Details
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
