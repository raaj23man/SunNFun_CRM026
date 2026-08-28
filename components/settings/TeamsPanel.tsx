"use client";

import React, { useState } from "react";
import { Users, Plus, MapPin, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";

export interface TeamItem {
  id: string;
  name: string;
  destination_scope: string[];
  users: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  }[];
}

interface TeamsPanelProps {
  teams: TeamItem[];
  isLoading?: boolean;
  onTeamCreated?: () => void;
}

export function TeamsPanel({ teams, isLoading = false, onTeamCreated }: TeamsPanelProps) {
  const [open, setOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [destScopeInput, setDestScopeInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const destinationScope = destScopeInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName.trim(),
          destination_scope: destinationScope,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create team.");
      }

      setTeamName("");
      setDestScopeInput("");
      setOpen(false);

      if (onTeamCreated) {
        onTeamCreated();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Destination Teams</h3>
          <p className="text-xs text-slate-500">
            Segment your sales agents by region or destination expertise.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <form onSubmit={handleCreateTeam}>
              <DialogHeader>
                <DialogTitle className="text-lg">Create Sales / Operations Team</DialogTitle>
                <DialogDescription>
                  Group staff members into a functional team with destination boundaries.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3">
                {error && (
                  <div className="p-2 text-xs bg-red-50 text-red-700 rounded border border-red-200">
                    {error}
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="team_name" className="text-xs font-semibold">
                    Team Name *
                  </Label>
                  <Input
                    id="team_name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Nepal Trekking Specialists"
                    required
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="dest_scope" className="text-xs font-semibold">
                    Destination Scope (Comma-separated)
                  </Label>
                  <Input
                    id="dest_scope"
                    value={destScopeInput}
                    onChange={(e) => setDestScopeInput(e.target.value)}
                    placeholder="Kathmandu, Pokhara, Everest Region"
                    className="h-9 text-sm"
                  />
                  <p className="text-[11px] text-slate-400">
                    Used to route destination-specific inquiries.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {isSubmitting ? "Creating..." : "Save Team"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-xs text-slate-400">
            Loading teams...
          </div>
        ) : teams.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-50 border border-dashed rounded-lg">
            No teams created yet. Create a team to group staff by destination scope.
          </div>
        ) : (
          teams.map((team) => (
            <Card key={team.id} className="border border-slate-200 shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>{team.name}</span>
                  <span className="text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {team.users.length} {team.users.length === 1 ? "member" : "members"}
                  </span>
                </CardTitle>
                {team.destination_scope.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {team.destination_scope.map((dest, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-0.5 text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"
                      >
                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                        {dest}
                      </span>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Staff Assigned:
                  </div>
                  {team.users.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No assigned members</p>
                  ) : (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {team.users.map((member) => (
                        <span
                          key={member.id}
                          className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          {member.first_name} {member.last_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
