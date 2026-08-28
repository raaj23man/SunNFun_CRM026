"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Inbox,
  Globe,
  Sparkles,
  Users,
  CheckSquare,
  Square,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
  Layers,
} from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function TripPlanRequestsPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Fetch all trip plan requests
  const { data, isLoading } = useQuery({
    queryKey: ["trip-plan-requests-all"],
    queryFn: async () => {
      const res = await fetch("/api/trip-plan-requests");
      if (!res.ok) throw new Error("Failed to load requests");
      return res.json();
    },
  });

  // Fetch team members for assignment
  const { data: usersData } = useQuery({
    queryKey: ["org-users-assignable"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) return { users: [] };
      return res.json();
    },
  });

  const requests = data?.requests || [];
  const users = usersData?.users || [];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === requests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(requests.map((r: any) => r.id));
    }
  };

  // Convert to Query Mutation
  const convertMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/trip-plan-requests/${requestId}/convert`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-plan-requests-all"] });
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

  // Bulk Assign Mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/trip-plan-requests/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_ids: selectedIds,
          assigned_user_id: selectedUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to bulk assign");
      return data;
    },
    onSuccess: () => {
      setBulkAssignOpen(false);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["trip-plan-requests-all"] });
    },
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Inbox className="w-6 h-6 text-purple-600" />
            Trip Plan Requests (Inbound Leads)
          </h1>
          <p className="text-xs text-slate-500">
            Unqualified leads captured from Website forms, Meta ads, Google ads, and Chatbots before converting to active queries.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <Button
            size="sm"
            onClick={() => setBulkAssignOpen(true)}
            className="bg-purple-700 hover:bg-purple-800 text-white text-xs gap-1.5 h-9"
          >
            <Users className="w-3.5 h-3.5" />
            Bulk Assign ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Data Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="text-xs font-semibold text-slate-600">
              <TableHead className="w-10 px-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="h-6 w-6 p-0"
                >
                  {selectedIds.length > 0 && selectedIds.length === requests.length ? (
                    <CheckSquare className="w-4 h-4 text-purple-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </Button>
              </TableHead>
              <TableHead className="py-3 px-3">Source Channel</TableHead>
              <TableHead className="py-3 px-3">Lead Contact</TableHead>
              <TableHead className="py-3 px-3">Destination</TableHead>
              <TableHead className="py-3 px-3">Assigned To</TableHead>
              <TableHead className="py-3 px-3">Received At</TableHead>
              <TableHead className="py-3 px-3">Status</TableHead>
              <TableHead className="py-3 px-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-xs text-slate-400">
                  Loading inbound leads...
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-xs text-slate-400">
                  No inbound trip plan requests received yet.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req: any) => {
                const isSelected = selectedIds.includes(req.id);
                const isConverted = req.status === "CONVERTED_TO_TRIP";

                return (
                  <TableRow
                    key={req.id}
                    className={`hover:bg-slate-50/70 border-b border-slate-100 text-xs transition-colors ${
                      isSelected ? "bg-purple-50/30" : ""
                    }`}
                  >
                    <TableCell className="px-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSelect(req.id)}
                        className="h-6 w-6 p-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </Button>
                    </TableCell>

                    {/* Source */}
                    <TableCell className="py-3 px-3 font-medium">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-purple-50 text-purple-700 border border-purple-100 font-semibold">
                        <Globe className="w-3 h-3 text-purple-500" />
                        {req.source}
                      </span>
                    </TableCell>

                    {/* Contact */}
                    <TableCell className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{req.guest_name}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                        <a href={`tel:${req.phone_number}`} className="hover:underline flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          {req.phone_number}
                        </a>
                        {req.email && (
                          <span className="flex items-center gap-0.5">
                            <Mail className="w-2.5 h-2.5" />
                            {req.email}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Destination */}
                    <TableCell className="py-3 px-3 font-medium text-slate-800">
                      {req.destination_text}
                    </TableCell>

                    {/* Assigned User */}
                    <TableCell className="py-3 px-3">
                      {req.assigned_user ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                          {req.assigned_user.first_name} {req.assigned_user.last_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </TableCell>

                    {/* Received At */}
                    <TableCell className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {formatDate(req.created_at)}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isConverted
                            ? "bg-emerald-100 text-emerald-800"
                            : req.status === "ASSIGNED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3 px-3 text-right">
                      {isConverted && req.converted_trip ? (
                        <Link href={`/trips/${req.converted_trip.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 bg-white">
                            View Query ({req.converted_trip.trip_display_id})
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          disabled={convertingId === req.id}
                          onClick={() => handleConvert(req.id)}
                          className="h-7 text-[11px] bg-slate-900 hover:bg-slate-800 text-white gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          {convertingId === req.id ? "Converting..." : "Convert to Query"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Bulk Assign Inbound Leads</DialogTitle>
            <DialogDescription className="text-xs">
              Assign {selectedIds.length} selected trip plan requests to a staff member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Staff Member</Label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="">Select an agent...</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkAssignOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedUserId || bulkAssignMutation.isPending}
              onClick={() => bulkAssignMutation.mutate()}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
            >
              {bulkAssignMutation.isPending ? "Assigning..." : "Assign Leads"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
