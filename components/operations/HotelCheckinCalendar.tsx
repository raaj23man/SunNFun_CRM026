"use client";

import React, { useMemo } from "react";
import { format, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { Hotel, Bed, Calendar, Phone, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HotelCheckinCalendarProps {
  startDate: string;
  endDate: string;
  gridData: Array<{
    hotel_id: string;
    hotel_name: string;
    destination_name: string;
    star_rating: number;
    bookings: Array<{
      id: string;
      trip_display_id: string;
      guest_name: string;
      guest_phone: string;
      check_in_date: string;
      check_out_date: string;
      room_count: number;
      pax_count: number;
      meal_plan: string;
      status: string;
      is_self_booked: boolean;
      supplier_confirmation_number?: string | null;
    }>;
  }>;
  onSelectBooking?: (booking: any) => void;
}

export function HotelCheckinCalendar({
  startDate,
  endDate,
  gridData,
  onSelectBooking,
}: HotelCheckinCalendarProps) {
  // Generate daily date columns across bounded interval
  const days = useMemo(() => {
    try {
      return eachDayOfInterval({
        start: new Date(startDate),
        end: new Date(endDate),
      });
    } catch {
      return [];
    }
  }, [startDate, endDate]);

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden flex flex-col">
      {/* Calendar Header Bar */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hotel className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Hotel Check-In / Out Grid View
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            ({days.length} Days • {gridData.length} Properties)
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Confirmed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" /> Self-Booked
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Pending
          </span>
        </div>
      </div>

      {/* Horizontal Scroll Matrix */}
      <div className="overflow-x-auto overflow-y-auto max-h-[680px]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 sticky top-0 z-20">
              {/* Sticky Hotel Header */}
              <th className="p-2.5 text-xs font-bold text-slate-700 w-56 min-w-[220px] sticky left-0 bg-slate-100 z-30 shadow-xs">
                Hotel Property
              </th>

              {/* Date Header Columns */}
              {days.map((d) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <th
                    key={d.toISOString()}
                    className={`p-1.5 text-center min-w-[100px] border-l border-slate-200 text-[11px] font-semibold ${
                      isWeekend ? "bg-slate-200/50 text-slate-900" : "text-slate-700"
                    }`}
                  >
                    <div>{format(d, "EEE")}</div>
                    <div className="text-[10px] font-mono text-slate-500 font-normal">
                      {format(d, "dd MMM")}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {gridData.map((hotel) => (
              <tr key={hotel.hotel_id} className="hover:bg-slate-50/50 transition-colors">
                {/* Sticky Hotel Name Column */}
                <td className="p-2.5 text-xs font-semibold text-slate-900 sticky left-0 bg-white z-10 shadow-xs border-r border-slate-200">
                  <div className="font-bold truncate max-w-[200px]" title={hotel.hotel_name}>
                    {hotel.hotel_name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal truncate">
                    {"★".repeat(hotel.star_rating || 3)} • {hotel.destination_name}
                  </div>
                </td>

                {/* Day Grid Cells */}
                {days.map((d) => {
                  // Find bookings overlapping this specific day
                  const dayBookings = hotel.bookings.filter((b) => {
                    const checkIn = new Date(b.check_in_date);
                    const checkOut = new Date(b.check_out_date);
                    return d >= checkIn && d <= checkOut;
                  });

                  return (
                    <td
                      key={d.toISOString()}
                      className="p-1 border-l border-slate-100 align-top h-14 min-w-[100px]"
                    >
                      <div className="space-y-1">
                        {dayBookings.map((b) => {
                          const isSelf = b.is_self_booked;
                          const isConfirmed = b.status === "CONFIRMED" || b.status === "VOUCHER_GENERATED";

                          const bgClass = isSelf
                            ? "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100"
                            : isConfirmed
                            ? "bg-emerald-50 text-emerald-950 border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-950 border-amber-200 hover:bg-amber-100";

                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => onSelectBooking && onSelectBooking(b)}
                              className={`w-full text-left p-1 rounded border text-[10px] leading-tight transition-all block truncate ${bgClass}`}
                              title={`${b.trip_display_id} • ${b.guest_name} (${b.room_count} Rooms, ${b.meal_plan})`}
                            >
                              <div className="font-bold truncate">
                                {b.guest_name}
                              </div>
                              <div className="font-mono text-[9px] opacity-80 flex items-center justify-between">
                                <span>{b.trip_display_id}</span>
                                <span>{b.room_count}R ({b.meal_plan})</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
