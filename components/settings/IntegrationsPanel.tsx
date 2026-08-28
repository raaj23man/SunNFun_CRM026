"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Webhook,
  BellRing,
  Key,
  Plus,
  Copy,
  Check,
  Power,
  RefreshCw,
  Trash2,
  Send,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
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

const INTEGRATION_TYPES = [
  { value: "WEBSITE_FORM", label: "WordPress / Website Form" },
  { value: "META_ADS", label: "Meta Lead Ads (Facebook/Instagram)" },
  { value: "GOOGLE_ADS", label: "Google Lead Form Ads" },
  { value: "CHATBOT", label: "Chatbot (BotPenguin / AI Assistant)" },
  { value: "GOOGLE_FORM", label: "Google Forms Connector" },
  { value: "WIX", label: "Wix Lead Webhook" },
  { value: "EMAIL_INBOX", label: "Email Inbox Sync (IMAP)" },
];

const NOTIFY_TRIGGER_EVENTS = [
  { value: "BOOKING_CONFIRMED", label: "Booking Confirmed" },
  { value: "PAYMENT_DUE_REMINDER", label: "Payment Due Reminder (48h/24h)" },
  { value: "PAYMENT_RECEIVED", label: "Payment Received / Receipt" },
  { value: "TRIP_STARTING_TOMORROW", label: "Trip Starting Tomorrow" },
  { value: "VOUCHER_GENERATED", label: "Voucher Generated" },
  { value: "FOLLOW_UP_DUE", label: "Follow-up Due Reminder" },
];

const RECIPIENT_TYPES = [
  { value: "GUEST", label: "Guest / Traveler" },
  { value: "ASSIGNED_AGENT", label: "Assigned Sales Agent" },
  { value: "SUPPLIER", label: "Hotel / Driver Supplier" },
];

export function IntegrationsPanel() {
  const queryClient = useQueryClient();
  const [createdKeyInfo, setCreatedKeyInfo] = useState<{ apiKey: string; name: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [createConnOpen, setCreateConnOpen] = useState(false);
  const [createRuleOpen, setCreateRuleOpen] = useState(false);

  // Form states
  const [connForm, setConnForm] = useState({
    name: "",
    type: "WEBSITE_FORM",
  });

  const [ruleForm, setRuleForm] = useState({
    name: "",
    trigger_event: "BOOKING_CONFIRMED",
    channel: "WHATSAPP",
    template_id: "",
    recipient_type: "GUEST",
  });

  // 1. Fetch Integrations
  const { data: intData, isLoading: intLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const res = await fetch("/api/integrations");
      if (!res.ok) throw new Error("Failed to load integrations");
      return res.json();
    },
  });

  // 2. Fetch Notify Rules
  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ["notify-rules"],
    queryFn: async () => {
      const res = await fetch("/api/notify-rules");
      if (!res.ok) throw new Error("Failed to load notify rules");
      return res.json();
    },
  });

  // 3. Fetch Recent Webhook Delivery Logs
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["webhook-logs"],
    queryFn: async () => {
      const res = await fetch("/api/webhooks/logs?limit=15");
      if (!res.ok) throw new Error("Failed to load webhook logs");
      return res.json();
    },
  });

  // Create Connection Mutation
  const createConnMutation = useMutation({
    mutationFn: async (payload: typeof connForm) => {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create integration");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setCreatedKeyInfo({ apiKey: data.api_key, name: data.connection.name });
      setCreateConnOpen(false);
      setConnForm({ name: "", type: "WEBSITE_FORM" });
    },
  });

  // Create Notify Rule Mutation
  const createRuleMutation = useMutation({
    mutationFn: async (payload: typeof ruleForm) => {
      const res = await fetch("/api/notify-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create rule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notify-rules"] });
      setCreateRuleOpen(false);
      setRuleForm({
        name: "",
        trigger_event: "BOOKING_CONFIRMED",
        channel: "WHATSAPP",
        template_id: "",
        recipient_type: "GUEST",
      });
    },
  });

  const handleCopyKey = () => {
    if (createdKeyInfo?.apiKey) {
      navigator.clipboard.writeText(createdKeyInfo.apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const connections = intData?.connections || [];
  const rules = rulesData?.rules || [];
  const logs = logsData?.logs || [];

  return (
    <div className="space-y-8">
      {/* Generated API Key Banner Modal */}
      {createdKeyInfo && (
        <Card className="border-amber-300 bg-amber-50/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-amber-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-700" />
              API Key Generated: {createdKeyInfo.name}
            </CardTitle>
            <CardDescription className="text-xs text-amber-800">
              Save this key securely. It is only displayed once and will not be recoverable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="bg-white border border-amber-300 px-3 py-1.5 rounded text-xs font-mono font-semibold text-slate-800 select-all flex-1">
                {createdKeyInfo.apiKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs flex items-center gap-1.5 border-amber-300 bg-white"
                onClick={handleCopyKey}
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey ? "Copied" : "Copy Key"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-amber-900"
                onClick={() => setCreatedKeyInfo(null)}
              >
                Dismiss
              </Button>
            </div>
            <p className="text-[11px] text-amber-800">
              Webhook URL: <code className="bg-white/80 px-1 py-0.5 rounded border border-amber-200">POST /api/leads/webhook</code> (Include header <code className="bg-white/80 px-1 py-0.5 rounded border border-amber-200">x-api-key: {createdKeyInfo.apiKey}</code>)
            </p>
          </CardContent>
        </Card>
      )}

      {/* SECTION 1: INBOUND LEAD INTEGRATIONS */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Webhook className="w-4 h-4 text-indigo-600" />
              Lead Ingestion &amp; Ad Connectors
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Public API-key authenticated webhook endpoints for Meta Ads, Google Ads, WordPress, and Chatbots.
            </CardDescription>
          </div>

          <Dialog open={createConnOpen} onOpenChange={setCreateConnOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Lead Source
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">Add Lead Integration Connection</DialogTitle>
                <DialogDescription className="text-xs">
                  Create a secure API key for n8n or ad platform webhooks to submit leads into TripPlanRequest.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createConnMutation.mutate(connForm);
                }}
                className="space-y-4 py-2"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Connection Name *</Label>
                  <Input
                    placeholder="e.g. Nepal Trekking Meta Ads Campaign"
                    value={connForm.name}
                    onChange={(e) => setConnForm({ ...connForm, name: e.target.value })}
                    required
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Lead Source Type *</Label>
                  <select
                    className="w-full h-8 text-xs rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={connForm.type}
                    onChange={(e) => setConnForm({ ...connForm, type: e.target.value })}
                  >
                    {INTEGRATION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <DialogFooter className="pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setCreateConnOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={createConnMutation.isPending || !connForm.name.trim()}
                  >
                    {createConnMutation.isPending ? "Generating..." : "Generate API Key"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-100">
          {intLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading integration connections...</div>
          ) : connections.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Webhook className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">No lead integration connections configured.</p>
              <p className="text-[11px] text-slate-400">Click &quot;Add Lead Source&quot; to generate an API key for your n8n workflow.</p>
            </div>
          ) : (
            connections.map((conn: any) => (
              <div key={conn.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">{conn.name}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {conn.type}
                    </span>
                    {conn.is_active ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Endpoint: <span className="text-slate-700">POST /api/leads/webhook</span> &bull; {conn.logs_count || 0} calls logged
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] text-slate-700"
                    onClick={async () => {
                      if (confirm("Regenerate API key? Existing webhooks will stop working until updated.")) {
                        const res = await fetch(`/api/integrations/${conn.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ regenerate_key: true }),
                        });
                        const data = await res.json();
                        if (data.api_key) {
                          setCreatedKeyInfo({ apiKey: data.api_key, name: conn.name });
                        }
                      }
                    }}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerate Key
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: NOTIFY AUTOMATION RULES */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-emerald-600" />
              Notify Engine &amp; WhatsApp Automation Rules
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Trigger-based automated WhatsApp and Email messages dispatched via n8n &amp; Meta Cloud API.
            </CardDescription>
          </div>

          <Dialog open={createRuleOpen} onOpenChange={setCreateRuleOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Notify Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">Create Notify Automation Rule</DialogTitle>
                <DialogDescription className="text-xs">
                  Configure a trigger event to dispatch a Meta-approved WhatsApp template via n8n.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createRuleMutation.mutate(ruleForm);
                }}
                className="space-y-4 py-2"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Rule Label (Optional)</Label>
                  <Input
                    placeholder="e.g. Send WhatsApp Voucher to Guest on Confirmation"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Trigger Event *</Label>
                  <select
                    className="w-full h-8 text-xs rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={ruleForm.trigger_event}
                    onChange={(e) => setRuleForm({ ...ruleForm, trigger_event: e.target.value })}
                  >
                    {NOTIFY_TRIGGER_EVENTS.map((ev) => (
                      <option key={ev.value} value={ev.value}>
                        {ev.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Meta-Approved WhatsApp Template ID *</Label>
                  <Input
                    placeholder="e.g. booking_confirmation_v2 or payment_reminder_48h"
                    value={ruleForm.template_id}
                    onChange={(e) => setRuleForm({ ...ruleForm, template_id: e.target.value })}
                    required
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-slate-400">Must match registered template name in Meta Business Suite.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Channel</Label>
                    <select
                      className="w-full h-8 text-xs rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-900"
                      value={ruleForm.channel}
                      onChange={(e) => setRuleForm({ ...ruleForm, channel: e.target.value })}
                    >
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">Email</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Recipient</Label>
                    <select
                      className="w-full h-8 text-xs rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-900"
                      value={ruleForm.recipient_type}
                      onChange={(e) => setRuleForm({ ...ruleForm, recipient_type: e.target.value })}
                    >
                      {RECIPIENT_TYPES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <DialogFooter className="pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setCreateRuleOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={createRuleMutation.isPending || !ruleForm.template_id.trim()}
                  >
                    {createRuleMutation.isPending ? "Saving..." : "Save Notify Rule"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-100">
          {rulesLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading notify rules...</div>
          ) : rules.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <BellRing className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">No Notify rules configured yet.</p>
              <p className="text-[11px] text-slate-400">Add a rule to automate WhatsApp payment reminders and booking alerts.</p>
            </div>
          ) : (
            rules.map((rule: any) => (
              <div key={rule.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">{rule.name || rule.trigger_event}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {rule.trigger_event}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                      {rule.channel} &bull; {rule.recipient_type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Template: <span className="text-slate-800 font-semibold">{rule.template_id}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={async () => {
                      if (confirm("Delete this Notify automation rule?")) {
                        await fetch(`/api/notify-rules/${rule.id}`, { method: "DELETE" });
                        queryClient.invalidateQueries({ queryKey: ["notify-rules"] });
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* SECTION 3: WEBHOOK DELIVERY & AUDIT LOGS */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-slate-700" />
              Webhook Delivery &amp; Event Logs
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Audit log of all inbound ad-leads, outbound n8n dispatches, and WhatsApp delivery callbacks.
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs flex items-center gap-1"
            onClick={() => refetchLogs()}
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {logsLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading delivery logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No webhook delivery logs recorded yet.</div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Direction</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">HTTP Code</th>
                  <th className="py-2.5 px-3">Details / Error</th>
                  <th className="py-2.5 px-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          log.direction === "INBOUND"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-purple-50 text-purple-700"
                        }`}
                      >
                        {log.direction === "INBOUND" ? (
                          <ArrowDownLeft className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {log.direction}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {log.response_code || "-"}
                    </td>
                    <td className="py-2 px-3 text-slate-600 max-w-xs truncate">
                      {log.error_message ? (
                        <span className="text-red-600 font-medium">{log.error_message}</span>
                      ) : (
                        <span className="text-slate-400">Processed successfully</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.attempted_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
