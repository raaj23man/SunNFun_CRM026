"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users as UsersIcon,
  Coins,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  CreditCard,
  Landmark,
  Webhook,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SettingsErrorBoundary } from "@/components/settings/SettingsErrorBoundary";
import { UsersTable, UserItem } from "@/components/settings/UsersTable";
import { InviteMemberDialog } from "@/components/settings/InviteMemberDialog";
import { TeamsPanel, TeamItem } from "@/components/settings/TeamsPanel";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { UserStatus } from "@prisma/client";

export default function OrganizationSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Billing address modal state
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingForm, setBillingForm] = useState({
    label: "",
    address_text: "",
    contact_number: "",
    billing_details: "",
    is_primary: true,
  });

  // Bank account modal state
  const [bankOpen, setBankOpen] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank_name: "",
    account_number: "",
    swift_code: "",
    currency: "USD",
  });

  // 1. Fetch Current Org Profile & Settings
  const { data: orgData, isLoading: orgLoading, refetch: refetchOrg } = useQuery({
    queryKey: ["org-settings"],
    queryFn: async () => {
      const res = await fetch("/api/org/settings");
      if (!res.ok) throw new Error("Failed to load organization settings.");
      return res.json();
    },
  });

  // 2. Fetch Users List
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["org-users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load organization members.");
      return res.json();
    },
  });

  // 3. Fetch Teams List
  const { data: teamsData, isLoading: teamsLoading, refetch: refetchTeams } = useQuery({
    queryKey: ["org-teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed to load teams.");
      return res.json();
    },
  });

  // Form state for Org Profile
  const [formState, setFormState] = useState({
    company_name: "",
    brand_short_name: "",
    support_contact_number: "",
    trip_prefix: "SBC-",
    default_timezone: "Asia/Kathmandu",
    force_2fa: false,
    brand_color_theme: "#0f172a",
  });

  useEffect(() => {
    if (orgData?.organization) {
      const org = orgData.organization;
      setFormState({
        company_name: org.company_name || "",
        brand_short_name: org.brand_short_name || "",
        support_contact_number: org.support_contact_number || "",
        trip_prefix: org.trip_prefix || "SBC-",
        default_timezone: org.default_timezone || "Asia/Kathmandu",
        force_2fa: !!org.force_2fa,
        brand_color_theme: org.brand_color_theme || "#0f172a",
      });
    }
  }, [orgData]);

  // Mutation to update org settings
  const updateOrgMutation = useMutation({
    mutationFn: async (payload: typeof formState) => {
      const res = await fetch("/api/org/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update settings.");
      return data;
    },
    onSuccess: () => {
      setProfileSuccessMsg("Organization profile updated successfully.");
      setProfileErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ["org-settings"] });
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setProfileErrorMsg(err.message || "Failed to update profile.");
      setProfileSuccessMsg(null);
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrgMutation.mutate(formState);
  };

  // Toggle user active/disabled status
  const handleUserStatusToggle = async (userId: string, newStatus: UserStatus) => {
    const res = await fetch(`/api/users/${userId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update status.");
    }
    queryClient.invalidateQueries({ queryKey: ["org-users"] });
  };

  // Create billing address
  const handleCreateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/org/billing-address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(billingForm),
    });
    if (res.ok) {
      setBillingOpen(false);
      setBillingForm({
        label: "",
        address_text: "",
        contact_number: "",
        billing_details: "",
        is_primary: false,
      });
      refetchOrg();
    }
  };

  // Create bank account
  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/org/bank-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bankForm),
    });
    if (res.ok) {
      setBankOpen(false);
      setBankForm({
        bank_name: "",
        account_number: "",
        swift_code: "",
        currency: "USD",
      });
      refetchOrg();
    }
  };

  const org = orgData?.organization;
  const users: UserItem[] = usersData?.users || [];
  const teams: TeamItem[] = teamsData?.teams || [];

  return (
    <SettingsErrorBoundary fallbackTitle="Organization Settings">
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Organization Settings
            </h1>
            <p className="text-sm text-slate-500">
              Manage your agency profile, multi-tenant branding, team members, and role privileges.
            </p>
          </div>
          {activeTab === "users" && (
            <InviteMemberDialog
              teams={teams}
              onMemberInvited={() => queryClient.invalidateQueries({ queryKey: ["org-users"] })}
            />
          )}
        </div>

        {/* Tabbed Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
            <TabsTrigger value="profile" className="flex items-center gap-2 text-xs font-semibold px-4 py-2">
              <Building2 className="w-4 h-4" />
              Organization Profile
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 text-xs font-semibold px-4 py-2">
              <UsersIcon className="w-4 h-4" />
              Users &amp; Teams ({users.length})
            </TabsTrigger>
            <TabsTrigger value="currencies" className="flex items-center gap-2 text-xs font-semibold px-4 py-2">
              <Coins className="w-4 h-4" />
              Currencies (Preview)
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2 text-xs font-semibold px-4 py-2">
              <Webhook className="w-4 h-4" />
              Integrations &amp; Notify (Part 7)
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PROFILE */}
          <TabsContent value="profile" className="space-y-6">
            <form onSubmit={handleProfileSubmit}>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Agency Core Identity
                  </CardTitle>
                  <CardDescription className="text-xs">
                    This information appears on customer quotes, booking vouchers, and driver trip sheets.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {profileSuccessMsg && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 rounded-md flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{profileSuccessMsg}</span>
                    </div>
                  )}

                  {profileErrorMsg && (
                    <div className="p-3 bg-red-50 text-red-800 text-xs border border-red-200 rounded-md flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{profileErrorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="company_name" className="text-xs font-semibold text-slate-700">
                        Legal Company Name *
                      </Label>
                      <Input
                        id="company_name"
                        value={formState.company_name}
                        onChange={(e) =>
                          setFormState({ ...formState, company_name: e.target.value })
                        }
                        placeholder="Sun & Fun Holidays Pvt. Ltd."
                        className="h-9 text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="brand_short_name" className="text-xs font-semibold text-slate-700">
                        Brand Short Name *
                      </Label>
                      <Input
                        id="brand_short_name"
                        value={formState.brand_short_name}
                        onChange={(e) =>
                          setFormState({ ...formState, brand_short_name: e.target.value })
                        }
                        placeholder="Sun & Fun Holidays"
                        className="h-9 text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="support_contact" className="text-xs font-semibold text-slate-700">
                        Primary 24/7 Support Hotline *
                      </Label>
                      <Input
                        id="support_contact"
                        value={formState.support_contact_number}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            support_contact_number: e.target.value,
                          })
                        }
                        placeholder="+977 1 4400000"
                        className="h-9 text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="trip_prefix" className="text-xs font-semibold text-slate-700">
                        Trip / Query ID Prefix *
                      </Label>
                      <Input
                        id="trip_prefix"
                        value={formState.trip_prefix}
                        onChange={(e) =>
                          setFormState({ ...formState, trip_prefix: e.target.value })
                        }
                        placeholder="SBC-"
                        className="h-9 text-sm font-mono"
                        required
                      />
                      <p className="text-[11px] text-slate-400">
                        Generates codes like {formState.trip_prefix}1001 for customer queries.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="default_timezone" className="text-xs font-semibold text-slate-700">
                        Default Timezone
                      </Label>
                      <select
                        id="default_timezone"
                        value={formState.default_timezone}
                        onChange={(e) =>
                          setFormState({ ...formState, default_timezone: e.target.value })
                        }
                        className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="Asia/Kathmandu">Asia/Kathmandu (UTC+05:45)</option>
                        <option value="Asia/Kolkata">Asia/Kolkata (UTC+05:30)</option>
                        <option value="Asia/Dubai">Asia/Dubai (UTC+04:00)</option>
                        <option value="Asia/Bangkok">Asia/Bangkok (UTC+07:00)</option>
                        <option value="UTC">UTC (Universal Coordinated Time)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="brand_color_theme" className="text-xs font-semibold text-slate-700">
                        Brand Accent Color
                      </Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          id="brand_color_theme"
                          value={formState.brand_color_theme || "#0f172a"}
                          onChange={(e) =>
                            setFormState({ ...formState, brand_color_theme: e.target.value })
                          }
                          className="w-9 h-9 p-0.5 rounded border border-slate-200 cursor-pointer"
                        />
                        <Input
                          value={formState.brand_color_theme || ""}
                          onChange={(e) =>
                            setFormState({ ...formState, brand_color_theme: e.target.value })
                          }
                          placeholder="#0f172a"
                          className="h-9 text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Security Policy Toggle */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        Mandatory Two-Factor Authentication (2FA)
                      </div>
                      <p className="text-xs text-slate-500">
                        When enabled, all staff accounts must authenticate using a TOTP authenticator app or biometric Passkey.
                      </p>
                    </div>
                    <Switch
                      checked={formState.force_2fa}
                      onCheckedChange={(val) => setFormState({ ...formState, force_2fa: val })}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={updateOrgMutation.isPending}
                      className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {updateOrgMutation.isPending ? "Saving..." : "Save Org Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>

            {/* Financial Details (Billing Addresses & Bank Accounts) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Billing Addresses Card */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-500" />
                      Billing Addresses
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Printed on customer invoices and supplier PO vouchers.
                    </CardDescription>
                  </div>

                  <Dialog open={billingOpen} onOpenChange={setBillingOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <Plus className="w-3 h-3" /> Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[420px]">
                      <form onSubmit={handleCreateBilling}>
                        <DialogHeader>
                          <DialogTitle className="text-base">Add Billing Address</DialogTitle>
                          <DialogDescription className="text-xs">
                            Define branch or legal headquarter billing details.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Label (e.g. Kathmandu HQ) *</Label>
                            <Input
                              required
                              value={billingForm.label}
                              onChange={(e) =>
                                setBillingForm({ ...billingForm, label: e.target.value })
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Address Text *</Label>
                            <Input
                              required
                              value={billingForm.address_text}
                              onChange={(e) =>
                                setBillingForm({ ...billingForm, address_text: e.target.value })
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Contact Phone *</Label>
                            <Input
                              required
                              value={billingForm.contact_number}
                              onChange={(e) =>
                                setBillingForm({ ...billingForm, contact_number: e.target.value })
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">VAT / PAN / Tax Details</Label>
                            <Input
                              value={billingForm.billing_details}
                              onChange={(e) =>
                                setBillingForm({ ...billingForm, billing_details: e.target.value })
                              }
                              placeholder="PAN: 600123456"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" size="sm" className="bg-slate-900 text-white">
                            Save Address
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  {org?.billing_addresses?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No billing addresses added.</p>
                  ) : (
                    org?.billing_addresses?.map((addr: any) => (
                      <div
                        key={addr.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1"
                      >
                        <div className="font-semibold text-slate-900 flex items-center justify-between">
                          <span>{addr.label}</span>
                          {addr.is_primary && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600">{addr.address_text}</div>
                        <div className="text-slate-500">Phone: {addr.contact_number}</div>
                        {addr.billing_details && (
                          <div className="text-slate-500 font-mono text-[11px]">
                            {addr.billing_details}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Bank Accounts Card */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-slate-500" />
                      Bank Accounts
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Used for wire transfers and customer remittance instructions.
                    </CardDescription>
                  </div>

                  <Dialog open={bankOpen} onOpenChange={setBankOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <Plus className="w-3 h-3" /> Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[420px]">
                      <form onSubmit={handleCreateBank}>
                        <DialogHeader>
                          <DialogTitle className="text-base">Add Bank Account</DialogTitle>
                          <DialogDescription className="text-xs">
                            Bank account details shown on payment requests.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Bank Name *</Label>
                            <Input
                              required
                              value={bankForm.bank_name}
                              onChange={(e) =>
                                setBankForm({ ...bankForm, bank_name: e.target.value })
                              }
                              placeholder="Standard Chartered Bank"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Account Number *</Label>
                            <Input
                              required
                              value={bankForm.account_number}
                              onChange={(e) =>
                                setBankForm({ ...bankForm, account_number: e.target.value })
                              }
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">SWIFT Code</Label>
                              <Input
                                value={bankForm.swift_code}
                                onChange={(e) =>
                                  setBankForm({ ...bankForm, swift_code: e.target.value })
                                }
                                placeholder="SCBLNPKA"
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Currency</Label>
                              <Input
                                value={bankForm.currency}
                                onChange={(e) =>
                                  setBankForm({ ...bankForm, currency: e.target.value })
                                }
                                placeholder="USD"
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" size="sm" className="bg-slate-900 text-white">
                            Save Bank Account
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  {org?.bank_accounts?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No bank accounts registered.</p>
                  ) : (
                    org?.bank_accounts?.map((acc: any) => (
                      <div
                        key={acc.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1"
                      >
                        <div className="font-semibold text-slate-900 flex items-center justify-between">
                          <span>{acc.bank_name}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-mono font-semibold">
                            {acc.currency}
                          </span>
                        </div>
                        <div className="text-slate-600 font-mono">Acc: {acc.account_number}</div>
                        {acc.swift_code && (
                          <div className="text-slate-500 font-mono text-[11px]">
                            SWIFT: {acc.swift_code}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: USERS & TEAMS */}
          <TabsContent value="users" className="space-y-6">
            <UsersTable
              users={users}
              isLoading={usersLoading}
              onStatusChange={handleUserStatusToggle}
            />

            <div className="pt-4 border-t border-slate-200">
              <TeamsPanel
                teams={teams}
                isLoading={teamsLoading}
                onTeamCreated={() => refetchTeams()}
              />
            </div>
          </TabsContent>

          {/* TAB 3: CURRENCIES (PREVIEW STUB) */}
          <TabsContent value="currencies" className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Multi-Currency &amp; Hyper-Localisation Engine
                </CardTitle>
                <CardDescription className="text-xs">
                  Sembark-parity currency formatting with region-aware decimal rounding and separator rules (PRD Part 1 / Part 4).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-2">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-blue-600" />
                    Currency Engine Overview (Phase 1 / Part 4)
                  </div>
                  <p>
                    In Travel CRM, quote line items, supplier vouchers, and payment receipts are calculated in their native currency. Sembark release v1.167 (&quot;Hyper-localisation of Currency&quot;) enforces that amounts are never arbitrarily summed across different currencies.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  {[
                    { code: "USD", symbol: "$", locale: "en-US", sample: "$ 4,500.00", label: "US Dollar" },
                    { code: "NPR", symbol: "रू", locale: "ne-NP", sample: "रू 1,25,000", label: "Nepalese Rupee" },
                    { code: "INR", symbol: "₹", locale: "en-IN", sample: "₹ 85,000", label: "Indian Rupee" },
                    { code: "EUR", symbol: "€", locale: "de-DE", sample: "4.500,00 €", label: "Euro" },
                  ].map((c) => (
                    <div
                      key={c.code}
                      className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900 text-sm">{c.code}</span>
                        <span className="text-xs text-slate-500 font-mono">{c.symbol}</span>
                      </div>
                      <div className="text-xs text-slate-600">{c.label}</div>
                      <div className="text-xs font-mono font-semibold text-emerald-700 bg-white p-1.5 rounded border border-slate-200">
                        {c.sample}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: INTEGRATIONS & NOTIFY AUTOMATION (PRD PART 7) */}
          <TabsContent value="integrations" className="space-y-6">
            <IntegrationsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </SettingsErrorBoundary>
  );
}
