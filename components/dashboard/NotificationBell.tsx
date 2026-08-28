"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, AlertTriangle, Clock, CheckCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-notifications"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    refetchInterval: 30000, // Check every 30 seconds
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0 rounded-full hover:bg-slate-100">
          <Bell className="w-4 h-4 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0 shadow-lg border-slate-200">
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className="font-semibold text-xs text-slate-800">Notifications &amp; Alerts</span>
          <span className="text-[10px] text-slate-500 font-medium">{unreadCount} active</span>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Loading alerts...</div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 space-y-1">
              <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto opacity-80" />
              <div>All caught up! No pending alerts.</div>
            </div>
          ) : (
            notifications.map((n: any) => (
              <Link
                key={n.id}
                href={n.link}
                onClick={() => setOpen(false)}
                className="block p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  {n.severity === "urgent" ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  ) : n.severity === "warning" ? (
                    <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 text-xs">
                    <div className="font-semibold text-slate-900 leading-snug">{n.title}</div>
                    <div className="text-slate-500 text-[11px] leading-relaxed line-clamp-2">
                      {n.message}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
