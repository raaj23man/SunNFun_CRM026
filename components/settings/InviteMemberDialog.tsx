"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserPlus, Copy, Check, Shield, AlertCircle } from "lucide-react";
import { Role } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inviteSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email address is required"),
  phone_number: z.string().optional(),
  role: z.nativeEnum(Role),
  team_id: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface InviteMemberDialogProps {
  teams?: { id: string; name: string }[];
  onMemberInvited?: () => void;
}

export function InviteMemberDialog({
  teams = [],
  onMemberInvited,
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invitedCredentials, setInvitedCredentials] = useState<{
    email: string;
    tempPass: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: Role.SALES_PERSON,
      team_id: "",
    },
  });

  const onSubmit = async (values: InviteFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        role: values.role,
        phone_number: values.phone_number || undefined,
        team_id: values.team_id && values.team_id !== "" ? values.team_id : undefined,
      };

      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to invite member.");
      }

      setInvitedCredentials({
        email: data.user.email,
        tempPass: data.temporaryPassword,
      });

      if (onMemberInvited) {
        onMemberInvited();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setInvitedCredentials(null);
    setErrorMessage(null);
    reset();
  };

  const copyToClipboard = () => {
    if (invitedCredentials) {
      navigator.clipboard.writeText(
        `Email: ${invitedCredentials.email}\nTemporary Password: ${invitedCredentials.tempPass}\nLogin: ${window.location.origin}/login`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => (val ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
          <UserPlus className="w-4 h-4" />
          Invite Member
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {invitedCredentials ? "Member Invited Successfully" : "Invite Organization Member"}
          </DialogTitle>
          <DialogDescription>
            {invitedCredentials
              ? "Share these temporary login credentials with the new team member."
              : "Add a new staff member to your organization with specific role-based permissions."}
          </DialogDescription>
        </DialogHeader>

        {invitedCredentials ? (
          <div className="space-y-5 py-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                <Check className="w-5 h-5 text-emerald-600" />
                Account Created &amp; Active
              </div>
              <div className="text-xs text-emerald-700">
                Email: <span className="font-mono font-bold text-slate-800">{invitedCredentials.email}</span>
              </div>
              <div className="text-xs text-emerald-700 flex items-center justify-between bg-white p-2.5 rounded border border-emerald-100">
                <div>
                  <span className="text-slate-500 block text-[11px]">Temporary Password:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm tracking-wider">
                    {invitedCredentials.tempPass}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="h-8 gap-1.5 text-xs text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Credentials
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded">
              Note: The user can change their password or register a biometric Passkey upon first login.
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full bg-slate-900 hover:bg-slate-800">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="first_name" className="text-xs font-semibold text-slate-700">
                  First Name *
                </Label>
                <Input
                  id="first_name"
                  placeholder="e.g. Maya"
                  {...register("first_name")}
                  className="h-9 text-sm"
                />
                {errors.first_name && (
                  <p className="text-[11px] text-red-500">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="last_name" className="text-xs font-semibold text-slate-700">
                  Last Name *
                </Label>
                <Input
                  id="last_name"
                  placeholder="e.g. Sharma"
                  {...register("last_name")}
                  className="h-9 text-sm"
                />
                {errors.last_name && (
                  <p className="text-[11px] text-red-500">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="maya@sunnfun.com"
                {...register("email")}
                className="h-9 text-sm"
              />
              {errors.email && (
                <p className="text-[11px] text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="role" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  Role *
                </Label>
                <select
                  id="role"
                  {...register("role")}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value={Role.SALES_PERSON}>Sales Person (Assigned Leads)</option>
                  <option value={Role.SALES_HEAD}>Sales Head (Org Pipeline)</option>
                  <option value={Role.OPERATIONS}>Operations (No Pricing)</option>
                  <option value={Role.RESERVATIONS}>Reservations (No Pricing)</option>
                  <option value={Role.ACCOUNTANT}>Accountant (Ledgers Only)</option>
                  <option value={Role.DATA_OPERATOR}>Data Operator (Master Inventory)</option>
                  <option value={Role.ADMIN}>Admin (Org Wide)</option>
                  <option value={Role.SUPER_ADMIN}>Super Admin</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="team_id" className="text-xs font-semibold text-slate-700">
                  Assign Team (Optional)
                </Label>
                <select
                  id="team_id"
                  {...register("team_id")}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">No Team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone_number" className="text-xs font-semibold text-slate-700">
                Phone Number (Optional)
              </Label>
              <Input
                id="phone_number"
                placeholder="+977 9800000000"
                {...register("phone_number")}
                className="h-9 text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white"
              >
                {isSubmitting ? "Inviting..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
