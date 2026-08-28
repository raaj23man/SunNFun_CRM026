"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Building2,
  Users,
  Shield,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardHomePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Phase 0 Infrastructure &amp; Security Live
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome, {user ? `${user.first_name} ${user.last_name}` : "Travel Specialist"}
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Your multi-tenant Travel CRM SaaS workspace is ready. You are authenticated as{" "}
            <span className="font-semibold text-white">{user?.role || "Member"}</span> with tenant-isolated database access.
          </p>

          <div className="pt-3 flex flex-wrap gap-3">
            {["SUPER_ADMIN", "ADMIN"].includes(user?.role) && (
              <Link href="/settings">
                <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100 font-semibold gap-1.5 text-xs shadow-sm">
                  <Building2 className="w-4 h-4" />
                  Configure Org Settings
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Decorative background element */}
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-8 translate-y-8 pointer-events-none">
          <Compass className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-5 pb-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2">
              <Shield className="w-5 h-5" />
            </div>
            <CardTitle className="text-base">Role-Based Security</CardTitle>
            <CardDescription className="text-xs">
              Every API route validates your role matrix and automatically scopes database queries to your organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-xs text-slate-500">
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Biometric Passkeys &amp; TOTP 2FA
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pricing Field Sanitization
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-5 pb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
              <Users className="w-5 h-5" />
            </div>
            <CardTitle className="text-base">Team Management</CardTitle>
            <CardDescription className="text-xs">
              Segment agents by destination expertise, assign leads, and grant granular permission overrides.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-xs text-slate-500">
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                User Invite &amp; Status Controls
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Destination Teams
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-5 pb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
              <Compass className="w-5 h-5" />
            </div>
            <CardTitle className="text-base">Phase 1: CRM Core (Next)</CardTitle>
            <CardDescription className="text-xs">
              Upcoming: Smart Lead Pipeline, Master Inventory (Hotels, Rates), Quote Engine &amp; Day-by-Day Itineraries.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-xs text-slate-500">
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-600">
                • Trip Plan Request Inbox
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                • Puppeteer PDF Quote Generator
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
