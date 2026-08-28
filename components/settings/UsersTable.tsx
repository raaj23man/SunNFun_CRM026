"use client";

import React, { useState } from "react";
import { Role, UserStatus } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserCheck, UserX, Shield, Clock } from "lucide-react";

export interface UserItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string | null;
  role: Role;
  status: UserStatus;
  last_login?: string | null;
  created_at: string;
  team_id?: string | null;
  team?: { id: string; name: string } | null;
}

interface UsersTableProps {
  users: UserItem[];
  isLoading?: boolean;
  onStatusChange?: (userId: string, newStatus: UserStatus) => Promise<void>;
  currentUserId?: string;
}

const roleBadgeVariants: Record<
  Role,
  { label: string; className: string }
> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  ADMIN: {
    label: "Admin",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  SALES_HEAD: {
    label: "Sales Head",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  SALES_PERSON: {
    label: "Sales Agent",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  OPERATIONS: {
    label: "Operations",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  RESERVATIONS: {
    label: "Reservations",
    className: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  DATA_OPERATOR: {
    label: "Data Operator",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  ACCOUNTANT: {
    label: "Accountant",
    className: "bg-teal-100 text-teal-800 border-teal-200",
  },
};

export function UsersTable({
  users,
  isLoading = false,
  onStatusChange,
  currentUserId,
}: UsersTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggleStatus = async (user: UserItem) => {
    if (!onStatusChange) return;
    const nextStatus = user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setUpdatingId(user.id);
    try {
      await onStatusChange(user.id, nextStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/80">
          <TableRow className="border-b border-slate-200 text-xs font-semibold text-slate-600">
            <TableHead className="py-3 px-4">User Name</TableHead>
            <TableHead className="py-3 px-4">Role</TableHead>
            <TableHead className="py-3 px-4">Team</TableHead>
            <TableHead className="py-3 px-4">User Since</TableHead>
            <TableHead className="py-3 px-4">Recent Activity</TableHead>
            <TableHead className="py-3 px-4">Status</TableHead>
            <TableHead className="py-3 px-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-sm text-slate-500">
                Loading members...
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-sm text-slate-500">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => {
              const roleMeta = roleBadgeVariants[u.role] || {
                label: u.role,
                className: "bg-slate-100 text-slate-800",
              };
              const isSelf = currentUserId === u.id;
              const initials = `${u.first_name[0] || ""}${u.last_name[0] || ""}`.toUpperCase();

              return (
                <TableRow
                  key={u.id}
                  className="hover:bg-slate-50/60 border-b border-slate-100 text-sm transition-colors"
                >
                  {/* User Name & Avatar */}
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {u.first_name} {u.last_name}
                          {isSelf && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${roleMeta.className}`}
                    >
                      {roleMeta.label}
                    </span>
                  </TableCell>

                  {/* Team */}
                  <TableCell className="py-3 px-4 text-xs text-slate-600">
                    {u.team ? (
                      <span className="font-medium text-slate-800">{u.team.name}</span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </TableCell>

                  {/* User Since */}
                  <TableCell className="py-3 px-4 text-xs text-slate-600">
                    {formatDate(u.created_at)}
                  </TableCell>

                  {/* Recent Activity */}
                  <TableCell className="py-3 px-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatDate(u.last_login)}
                    </span>
                  </TableCell>

                  {/* Status with green/red dot */}
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          u.status === "ACTIVE"
                            ? "bg-emerald-500 ring-4 ring-emerald-100"
                            : "bg-red-500 ring-4 ring-red-100"
                        }`}
                      />
                      <span
                        className={`text-xs font-medium ${
                          u.status === "ACTIVE" ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {u.status === "ACTIVE" ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-3 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updatingId === u.id}
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="w-4 h-4 text-slate-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel className="text-xs text-slate-500">
                          Manage Account
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {!isSelf && onStatusChange && (
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(u)}
                            className={
                              u.status === "ACTIVE"
                                ? "text-red-600 focus:text-red-600 focus:bg-red-50"
                                : "text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"
                            }
                          >
                            {u.status === "ACTIVE" ? (
                              <>
                                <UserX className="w-4 h-4 mr-2" />
                                Disable Member
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Activate Member
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
