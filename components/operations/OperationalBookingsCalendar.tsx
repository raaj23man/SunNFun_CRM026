"use client";

import React, { useMemo } from "react";
import { format, eachDayOfInterval, isSameDay } from "date-fns";
import { Compass, Users, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

interface OperationalBookingsCalendarProps {
  startDate: string;
  endDate: string;
  trips: Array<any>;
  onSelectBooking?: (booking: any) => void;
}

export function OperationalBookingsCalendar({
  startDate,
  endDate,
  trips,
  onSelectBooking,
}: OperationalBookingsCalendarProps) {
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
      {/* Header Bar */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Operational Trips Timeline
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            ({trips.length} Active Trips in Window)
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto overflow-y-auto max-h-[680px]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 sticky top-0 z-20">
              <th className="p-2.5 text-xs font-bold text-slate-700 w-64 min-w-[240px] sticky left-0 bg-slate-100 z-30 shadow-xs">
                Trip / Guest
              </th>
              {days.map((d) => (
                <th
                  key={d.toISOString()}
                  className="p-1.5 text-center min-w-[90px] border-l border-slate-200 text-[11px] font-semibold text-slate-700"
                >
                  <div>{format(d, "EEE")}</div>
                  <div className="text-[10px] font-mono text-slate-500 font-normal">
                    {format(d, "dd MMM")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {trips.map((trip) => {
              const tripStart = new Date(trip.start_date);
              const tripDurationDays = trip.duration_days || 4;
              const tripEnd = trip.end_date
                ? new Date(trip.end_date)
                : new Date(tripStart.getTime() + (tripDurationDays - 1) * 86400000);

              return (
                <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Sticky Trip Info */}
                  <td className="p-2.5 text-xs font-semibold text-slate-900 sticky left-0 bg-white z-10 shadow-xs border-r border-slate-200">
                    <Link
                      href={`/trips/${trip.id}`}
                      className="hover:underline flex items-center justify-between"
                    >
                      <span className="font-mono font-bold text-slate-900">{trip.trip_display_id}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-normal">
                        {trip.destination?.name || "Tour"}
                      </span>
                    </Link>
                    <div className="text-[11px] text-slate-600 font-normal truncate mt-0.5">
                      {trip.guest?.full_name} ({trip.pax_adults || 2} Pax)
                    </div>
                  </td>

                  {/* Day Blocks */}
                  {days.map((d) => {
                    const isTripActive = d >= tripStart && d <= tripEnd;
                    // Find services on this specific date
                    const dayServices = (trip.service_bookings || []).filter((s: any) => {
                      const sDate = new Date(s.service_date);
                      return isSameDay(d, sDate);
                    });

                    return (
                      <td
                        key={d.toISOString()}
                        className={`p-1 border-l border-slate-100 align-top h-14 min-w-[90px] ${
                          isTripActive ? "bg-emerald-50/20" : ""
                        }`}
                      >
                        {isTripActive && (
                          <div className="space-y-1">
                            {dayServices.length > 0 ? (
                              dayServices.map((service: any) => (
                                <button
                                  key={service.id}
                                  type="button"
                                  onClick={() => onSelectBooking && onSelectBooking(service)}
                                  className="w-full text-left p-1 bg-white hover:bg-emerald-100 rounded border border-emerald-300 text-[9px] block truncate font-medium text-emerald-950 shadow-2xs"
                                >
                                  {service.service_name}
                                </button>
                              ))
                            ) : (
                              <div className="h-2 rounded bg-emerald-300/50 mt-4" />
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
