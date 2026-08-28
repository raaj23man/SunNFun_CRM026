"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfToday } from "date-fns";
import {
  Calendar as CalendarIcon,
  Hotel,
  Compass,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Clock,
  Car,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HotelCheckinCalendar } from "@/components/operations/HotelCheckinCalendar";
import { OperationalBookingsCalendar } from "@/components/operations/OperationalBookingsCalendar";
import { SetPaymentPreferenceModal } from "@/components/operations/SetPaymentPreferenceModal";
import { DispatchShareModal } from "@/components/operations/DispatchShareModal";

export default function OperationsCalendarPage() {
  const today = startOfToday();
  const [activeView, setActiveView] = useState<"hotel_grid" | "trips_timeline">("hotel_grid");
  const [startDate, setStartDate] = useState<string>(format(today, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(addDays(today, 14), "yyyy-MM-dd"));

  // Modal State
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<any | null>(null);
  const [selectedBookingForDispatch, setSelectedBookingForDispatch] = useState<string | null>(null);

  // 1. Fetch Hotel Check-Ins
  const { data: hotelData, isLoading: hotelLoading } = useQuery({
    queryKey: ["hotel-checkins", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/operations/calendar/hotel-checkins?start_date=${startDate}&end_date=${endDate}`
      );
      if (!res.ok) throw new Error("Failed to load hotel check-in data");
      return res.json();
    },
    enabled: activeView === "hotel_grid",
  });

  // 2. Fetch Trips Timeline
  const { data: tripsData, isLoading: tripsLoading } = useQuery({
    queryKey: ["operations-trips", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/operations/calendar/trips?start_date=${startDate}&end_date=${endDate}`
      );
      if (!res.ok) throw new Error("Failed to load operational trips");
      return res.json();
    },
    enabled: activeView === "trips_timeline",
  });

  const handleRangePreset = (daysCount: number) => {
    const start = new Date(startDate);
    setEndDate(format(addDays(start, daysCount - 1), "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            Operations &amp; Dispatch Smart Calendars
          </h1>
          <p className="text-xs text-slate-500">
            Real-time occupancy grids and continuous movement radar across bounded date intervals.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <Tabs
            value={activeView}
            onValueChange={(v) => setActiveView(v as any)}
            className="w-auto"
          >
            <TabsList className="bg-slate-100 p-1">
              <TabsTrigger value="hotel_grid" className="text-xs font-semibold gap-1.5">
                <Hotel className="w-3.5 h-3.5 text-indigo-600" />
                Hotel Check-In/Out Grid
              </TabsTrigger>
              <TabsTrigger value="trips_timeline" className="text-xs font-semibold gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                Trips Timeline
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Date Controls & Range Presets */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 px-2 bg-white border border-slate-200 rounded text-xs font-mono"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 px-2 bg-white border border-slate-200 rounded text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-semibold uppercase mr-1">Presets:</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRangePreset(7)}
            className="h-7 text-xs bg-white"
          >
            7 Days
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRangePreset(14)}
            className="h-7 text-xs bg-white"
          >
            14 Days
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRangePreset(30)}
            className="h-7 text-xs bg-white"
          >
            30 Days
          </Button>
        </div>
      </div>

      {/* Main Calendar View */}
      {activeView === "hotel_grid" ? (
        hotelLoading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading hotel check-in matrix...</div>
        ) : (
          <HotelCheckinCalendar
            startDate={startDate}
            endDate={endDate}
            gridData={hotelData?.grid || []}
            onSelectBooking={(b) => setSelectedBookingForPayment(b)}
          />
        )
      ) : tripsLoading ? (
        <div className="p-16 text-center text-xs text-slate-400">Loading trips timeline...</div>
      ) : (
        <OperationalBookingsCalendar
          startDate={startDate}
          endDate={endDate}
          trips={tripsData?.trips || []}
          onSelectBooking={(b) => setSelectedBookingForPayment(b)}
        />
      )}

      {/* Set Payment Preference Modal */}
      <SetPaymentPreferenceModal
        booking={selectedBookingForPayment}
        isOpen={!!selectedBookingForPayment}
        onClose={() => setSelectedBookingForPayment(null)}
      />

      {/* Dispatch Share Modal */}
      <DispatchShareModal
        serviceBookingId={selectedBookingForDispatch}
        isOpen={!!selectedBookingForDispatch}
        onClose={() => setSelectedBookingForDispatch(null)}
      />
    </div>
  );
}
