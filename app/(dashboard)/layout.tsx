"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Shield,
  Building,
  Menu,
  X,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CurrentUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  organization_id: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading SunNFun Travel CRM...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "SALES_PERSON", "OPERATIONS", "RESERVATIONS", "ACCOUNTANT", "DATA_OPERATOR"],
    },
    {
      label: "Organization Settings",
      href: "/settings",
      icon: Settings,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
  ];

  const allowedNav = navItems.filter(
    (item) => !user || item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen flex bg-slate-50/60">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white p-4 justify-between shrink-0 shadow-sm">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
              <Compass className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 tracking-tight">SunNFun CRM</div>
              <div className="text-[10px] text-slate-400 font-medium">Travel SaaS Platform</div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href === "/dashboard" && pathname === "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          {user && (
            <div className="px-2.5 py-2 bg-slate-50 rounded-lg border border-slate-100">
              <div className="font-semibold text-xs text-slate-900 truncate">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 font-medium">
                <Shield className="w-2.5 h-2.5" />
                {user.role}
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-xs text-red-600 hover:bg-red-50 hover:text-red-700 gap-2 h-8"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Topbar */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              <Compass className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-bold text-sm text-slate-900">SunNFun CRM</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1 h-8 w-8"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </header>

        {/* Mobile Dropdown Nav */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-3">
            <nav className="space-y-1">
              {allowedNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-xs text-red-600 hover:bg-red-50"
            >
              Sign Out
            </Button>
          </div>
        )}

        <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
