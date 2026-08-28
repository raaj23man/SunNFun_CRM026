"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Inbox, Globe, Sparkles, UserPlus, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PlanRequestsInboxCard() {
  const queryClient = useQueryClient();
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["trip-plan-requests", "UNASSIGNED"],
    queryFn: async () => {
      const res = await fetch("/api/trip-plan-requests?status=UNASSIGNED");
      if (!res.ok) throw new Error("Failed to load requests");
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const requests = data?.requests || [];

  const convertMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/trip-plan-requests/${requestId}/convert`, {
        method: "POST",
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to convert");
      return resData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-plan-requests"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const handleConvert = async (id: string) => {
    setConvertingId(id);
    try {
      await convertMutation.mutateAsync(id);
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Inbox className="w-4 h-4 text-purple-600" />
            Inbound Trip Plan Requests
          </CardTitle>
          <span className="text-[11px] text-slate-500">
            Unassigned leads from Website, Meta &amp; Google Ads
          </span>
        </div>
        <Link href="/trip-plan-requests">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-700 hover:bg-purple-50">
            View All ({requests.length})
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-5 space-y-3">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-slate-400">Loading inbox...</div>
        ) : requests.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-dashed rounded-lg text-xs text-slate-400 text-center space-y-1">
            <Check className="w-5 h-5 text-emerald-500 mx-auto" />
            <div>Inbox Zero! All inbound requests are qualified.</div>
          </div>
        ) : (
          requests.slice(0, 3).map((req: any) => (
            <div
              key={req.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{req.guest_name}</span>
                <span className="bg-purple-100 text-purple-800 font-medium px-2 py-0.5 rounded text-[10px]">
                  {req.source}
                </span>
              </div>

              <div className="text-[11px] text-slate-600">
                Destination: <span className="font-medium text-slate-900">{req.destination_text}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-[11px] text-slate-400 font-mono">{req.phone_number}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={convertingId === req.id}
                  onClick={() => handleConvert(req.id)}
                  className="h-6 text-[10px] bg-white border-purple-200 text-purple-700 hover:bg-purple-50 gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  {convertingId === req.id ? "Converting..." : "Convert to Query"}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
