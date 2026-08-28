"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  Compass,
  User,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Shield,
  Lock,
  Unlock,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TripStatus } from "@prisma/client";

const statusBadgeStyles: Record<TripStatus, { label: string; className: string }> = {
  NEW_QUERY: { label: "New Query", className: "bg-blue-100 text-blue-800 border-blue-200" },
  IN_PROGRESS: { label: "In Progress", className: "bg-amber-100 text-amber-800 border-amber-200" },
  ON_HOLD: { label: "On Hold", className: "bg-purple-100 text-purple-800 border-purple-200" },
  CONVERTED: { label: "Converted", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  COMPLETED: { label: "Completed", className: "bg-slate-100 text-slate-800 border-slate-200" },
  CANCELLED: { label: "Cancelled", className: "bg-rose-100 text-rose-800 border-rose-200" },
  DROPPED: { label: "Dropped (Irreversible)", className: "bg-red-100 text-red-900 border-red-200 font-bold" },
};

export default function TripDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const tripId = params.id as string;

  // Add Tourist modal state
  const [addTouristOpen, setAddTouristOpen] = useState(false);
  const [touristName, setTouristName] = useState("");
  const [touristAge, setTouristAge] = useState("");
  const [touristRelation, setTouristRelation] = useState("");

  // Add Follow-up modal state
  const [addFollowUpOpen, setAddFollowUpOpen] = useState(false);
  const [followUpDueDate, setFollowUpDueDate] = useState("");
  const [followUpRemarks, setFollowUpRemarks] = useState("");

  // Document upload link state
  const [generatedDocLink, setGeneratedDocLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Drop trip confirmation modal
  const [dropConfirmOpen, setDropConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Trip Details
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["trip-details", tripId],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}`);
      if (!res.ok) throw new Error("Failed to load trip details");
      return res.json();
    },
  });

  const trip = data?.trip;

  // 2. Lifecycle Action Mutation
  const actionMutation = useMutation({
    mutationFn: async (action: string) => {
      setActionError(null);
      const res = await fetch(`/api/trips/${tripId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Action failed");
      return resData;
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (err: any) => {
      setActionError(err.message);
    },
  });

  // 3. Request Documents Mutation (Generates expiring secure upload link)
  const requestDocsMutation = useMutation({
    mutationFn: async () => {
      if (!trip?.guest?.id) return;
      const res = await fetch(`/api/guests/${trip.guest.id}/documents/request-upload`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate link");
      return data;
    },
    onSuccess: (data) => {
      setGeneratedDocLink(data.uploadUrl);
    },
  });

  // 4. Add Tourist Mutation
  const addTouristMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/trips/${tripId}/tourists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: touristName,
          age: touristAge ? parseInt(touristAge, 10) : undefined,
          relation_to_primary_guest: touristRelation || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add tourist");
      return data;
    },
    onSuccess: () => {
      setAddTouristOpen(false);
      setTouristName("");
      setTouristAge("");
      setTouristRelation("");
      refetch();
    },
  });

  // 5. Delete Tourist Mutation
  const deleteTouristMutation = useMutation({
    mutationFn: async (touristId: string) => {
      const res = await fetch(`/api/tourists/${touristId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete tourist");
    },
    onSuccess: () => refetch(),
  });

  // 6. Add FollowUp Mutation
  const addFollowUpMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          due_date: followUpDueDate,
          remarks: followUpRemarks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add follow-up");
      return data;
    },
    onSuccess: () => {
      setAddFollowUpOpen(false);
      setFollowUpDueDate("");
      setFollowUpRemarks("");
      refetch();
    },
  });

  // 7. Complete FollowUp Mutation
  const completeFollowUpMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/follow-ups/${id}/complete`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to complete follow-up");
    },
    onSuccess: () => refetch(),
  });

  const copyDocLink = () => {
    if (generatedDocLink) {
      navigator.clipboard.writeText(generatedDocLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading trip details...</div>;
  }

  if (!trip) {
    return <div className="p-12 text-center text-xs text-red-500">Trip not found.</div>;
  }

  const statusMeta = statusBadgeStyles[trip.status as TripStatus] || {
    label: trip.status,
    className: "bg-slate-100 text-slate-800",
  };

  const isPreConversion = ["NEW_QUERY", "IN_PROGRESS", "ON_HOLD"].includes(trip.status);
  const isConverted = trip.status === "CONVERTED";
  const isCancelled = trip.status === "CANCELLED";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/trips">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1 text-slate-600">
              <ArrowLeft className="w-3.5 h-3.5" />
              Pipeline
            </Button>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <span className="font-mono font-bold text-lg text-slate-900 tracking-tight">
            {trip.trip_display_id}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${statusMeta.className}`}
          >
            {statusMeta.label}
          </span>
          {trip.is_locked && (
            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              <Lock className="w-3 h-3" /> Locked
            </span>
          )}
        </div>

        {/* Lifecycle Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pre-Conversion Actions */}
          {isPreConversion && (
            <>
              {trip.status === "ON_HOLD" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => actionMutation.mutate("UNHOLD")}
                  className="h-8 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Resume Query
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => actionMutation.mutate("HOLD")}
                  className="h-8 text-xs gap-1 text-purple-700 border-purple-200 hover:bg-purple-50"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  Hold
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => actionMutation.mutate("CANCEL")}
                className="h-8 text-xs gap-1 text-rose-700 border-rose-200 hover:bg-rose-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Inquiry
              </Button>

              <Button
                size="sm"
                onClick={() => actionMutation.mutate("CONVERT")}
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Convert to Booking
              </Button>
            </>
          )}

          {/* Reopen pre-conversion Cancelled trip */}
          {isCancelled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => actionMutation.mutate("REOPEN_CANCELLED")}
              className="h-8 text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Reopen Inquiry
            </Button>
          )}

          {/* Post-Conversion Actions */}
          {isConverted && (
            <>
              <Button
                size="sm"
                onClick={() => actionMutation.mutate("COMPLETE")}
                className="h-8 text-xs gap-1 bg-slate-900 text-white hover:bg-slate-800"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Completed
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setDropConfirmOpen(true)}
                className="h-8 text-xs gap-1 text-red-700 border-red-200 hover:bg-red-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Drop Booking
              </Button>
            </>
          )}

          {/* Lock / Unlock Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => actionMutation.mutate(trip.is_locked ? "UNLOCK" : "LOCK")}
            className="h-8 text-xs text-slate-500 hover:bg-slate-100"
          >
            {trip.is_locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Grid: Left Side (Guest & Tourists) | Right Side (Follow-ups & Tasks) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Primary Guest & Secure Upload Link */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  Primary Guest Information
                </CardTitle>
                <span className="text-[11px] text-slate-500">Contact and identity records</span>
              </div>

              {/* Request Documents Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => requestDocsMutation.mutate()}
                disabled={requestDocsMutation.isPending}
                className="h-8 text-xs gap-1.5 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                {requestDocsMutation.isPending ? "Generating..." : "Request Documents"}
              </Button>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Secure Document Link Banner */}
              {generatedDocLink && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-2">
                  <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Secure Self-Upload Link Ready
                  </div>
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-emerald-100">
                    <span className="font-mono text-[11px] text-slate-700 truncate max-w-sm">
                      {generatedDocLink}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyDocLink}
                      className="h-6 text-[10px] gap-1 text-emerald-800"
                    >
                      {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedLink ? "Copied" : "Copy Link"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-emerald-700">
                    Send this link to the guest via WhatsApp/email so they can upload passports securely.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Guest Name:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {trip.guest?.salutation} {trip.guest?.full_name}
                  </span>
                  {trip.guest?.is_repeat_traveler && (
                    <span className="inline-block mt-0.5 text-[10px] bg-purple-100 text-purple-800 font-semibold px-1.5 py-0.2 rounded">
                      Repeat Traveler
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Phone Number:</span>
                  <a
                    href={`tel:${trip.guest?.phone_number}`}
                    className="font-mono font-semibold text-emerald-700 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Phone className="w-3 h-3" />
                    {trip.guest?.phone_number}
                  </a>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Email:</span>
                  <span className="text-slate-700 font-mono">
                    {trip.guest?.email || "Not provided"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Tourist Co-Travelers List */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Tourists &amp; Co-Travelers ({trip.tourists?.length || 0})
                </CardTitle>
                <span className="text-[11px] text-slate-500">
                  Multi-pax room split and flight passenger details
                </span>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddTouristOpen(true)}
                className="h-8 text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Tourist
              </Button>
            </CardHeader>

            <CardContent className="p-5 space-y-3">
              {trip.tourists?.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed rounded-lg text-xs text-slate-400 text-center">
                  No additional co-travelers added yet. Click &quot;Add Tourist&quot; for group / family members.
                </div>
              ) : (
                trip.tourists?.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{t.full_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {t.age ? `Age: ${t.age}` : "Age not specified"} •{" "}
                        {t.relation_to_primary_guest || "Co-Traveler"}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTouristMutation.mutate(t.id)}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN (1 Col: Follow-ups & Reminders) */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Follow-ups &amp; Tasks
                </CardTitle>
                <span className="text-[11px] text-slate-500">Scheduled reminders</span>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddFollowUpOpen(true)}
                className="h-7 text-xs gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </Button>
            </CardHeader>

            <CardContent className="p-5 space-y-3">
              {trip.follow_ups?.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-dashed rounded-lg text-xs text-slate-400 text-center">
                  No pending follow-ups.
                </div>
              ) : (
                trip.follow_ups?.map((fu: any) => (
                  <div
                    key={fu.id}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      fu.status === "COMPLETED"
                        ? "bg-slate-50 border-slate-200 opacity-60"
                        : "bg-indigo-50/40 border-indigo-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 font-mono text-[11px]">
                        Due: {formatDate(fu.due_date)}
                      </span>
                      {fu.status !== "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => completeFollowUpMutation.mutate(fu.id)}
                          className="h-6 text-[10px] bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Done
                        </Button>
                      )}
                    </div>
                    <p className="text-slate-700 text-[11px]">{fu.remarks}</p>
                    <div className="text-[10px] text-slate-400">
                      Assigned to: {fu.assigned_to?.first_name} {fu.assigned_to?.last_name}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Tourist Dialog */}
      <Dialog open={addTouristOpen} onOpenChange={setAddTouristOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Tourist Co-Traveler</DialogTitle>
            <DialogDescription className="text-xs">
              Add family or group members on this trip.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input
                value={touristName}
                onChange={(e) => setTouristName(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Age</Label>
                <Input
                  value={touristAge}
                  onChange={(e) => setTouristAge(e.target.value)}
                  type="number"
                  placeholder="34"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Relation</Label>
                <Input
                  value={touristRelation}
                  onChange={(e) => setTouristRelation(e.target.value)}
                  placeholder="Spouse / Child"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setAddTouristOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!touristName.trim() || addTouristMutation.isPending}
              onClick={() => addTouristMutation.mutate()}
              className="bg-slate-900 text-white text-xs h-8"
            >
              Save Tourist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Follow-up Dialog */}
      <Dialog open={addFollowUpOpen} onOpenChange={setAddFollowUpOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Schedule Follow-up</DialogTitle>
            <DialogDescription className="text-xs">
              Set a reminder date and note for this client query.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Due Date *</Label>
              <Input
                type="date"
                value={followUpDueDate}
                onChange={(e) => setFollowUpDueDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Remarks / Next Action *</Label>
              <Input
                value={followUpRemarks}
                onChange={(e) => setFollowUpRemarks(e.target.value)}
                placeholder="Call client regarding quote revisions"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setAddFollowUpOpen(false)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!followUpDueDate || !followUpRemarks.trim() || addFollowUpMutation.isPending}
              onClick={() => addFollowUpMutation.mutate()}
              className="bg-slate-900 text-white text-xs h-8"
            >
              Save Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drop Trip Irreversible Confirmation Modal */}
      <Dialog open={dropConfirmOpen} onOpenChange={setDropConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Confirm Booking Drop
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Dropping a confirmed booking is an <strong>irreversible action</strong> per Sembark rules. Cancellation charges and supplier penalty vouchers will apply.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button size="sm" variant="outline" onClick={() => setDropConfirmOpen(false)} className="text-xs h-8">
              Keep Booking
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setDropConfirmOpen(false);
                actionMutation.mutate("DROP");
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-8"
            >
              Confirm Permanent Drop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
