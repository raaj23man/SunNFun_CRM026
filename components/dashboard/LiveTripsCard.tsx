"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Compass, Users, Phone, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LiveTripsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["live-trips"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/live-trips");
      if (!res.ok) throw new Error("Failed to load live trips");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const liveTrips = data?.liveTrips || [];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-600 animate-spin" style={{ animationDuration: "12s" }} />
            Live Trips (On-Trip Radar)
          </CardTitle>
          <span className="text-[11px] text-slate-500">
            Tourists currently traveling on ground
          </span>
        </div>
        <span className="text-xs bg-cyan-100 text-cyan-800 font-semibold px-2 py-0.5 rounded-full">
          {liveTrips.length} active
        </span>
      </CardHeader>

      <CardContent className="p-5 space-y-3">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-slate-400">Scanning radar...</div>
        ) : liveTrips.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-dashed rounded-lg text-xs text-slate-400 text-center">
            No guests currently traveling today.
          </div>
        ) : (
          liveTrips.map((trip: any) => (
            <div
              key={trip.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900">{trip.trip_display_id}</span>
                <span className="bg-cyan-100 text-cyan-900 font-semibold px-2 py-0.5 rounded text-[10px]">
                  Day {trip.current_day} of {trip.duration_days}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-700">
                <span className="font-semibold text-slate-900">{trip.guest_name}</span>
                <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                  <Users className="w-3 h-3 text-slate-400" />
                  {trip.total_pax} Pax
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {trip.destination_name}
                </span>
                <a
                  href={`tel:${trip.guest_phone}`}
                  className="flex items-center gap-1 text-emerald-700 hover:underline font-medium"
                >
                  <Phone className="w-3 h-3" />
                  {trip.guest_phone}
                </a>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
