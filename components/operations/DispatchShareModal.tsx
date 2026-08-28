"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Car, User, ShieldCheck, Copy, Check, ExternalLink, Phone } from "lucide-react";

interface DispatchShareModalProps {
  serviceBookingId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DispatchShareModal({
  serviceBookingId,
  isOpen,
  onClose,
}: DispatchShareModalProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  // Fetch Guest Tab Copy
  const { data: guestData, isLoading: guestLoading } = useQuery({
    queryKey: ["dispatch-share", serviceBookingId, "guest"],
    queryFn: async () => {
      const res = await fetch(`/api/dispatch/${serviceBookingId}/share-text?audience=guest`);
      if (!res.ok) throw new Error("Failed to load guest dispatch text");
      return res.json();
    },
    enabled: !!serviceBookingId && isOpen,
  });

  // Fetch Driver Tab Copy
  const { data: driverData, isLoading: driverLoading } = useQuery({
    queryKey: ["dispatch-share", serviceBookingId, "driver"],
    queryFn: async () => {
      const res = await fetch(`/api/dispatch/${serviceBookingId}/share-text?audience=driver`);
      if (!res.ok) throw new Error("Failed to load driver dispatch text");
      return res.json();
    },
    enabled: !!serviceBookingId && isOpen,
  });

  // Fetch Provider Tab Copy
  const { data: providerData, isLoading: providerLoading } = useQuery({
    queryKey: ["dispatch-share", serviceBookingId, "provider"],
    queryFn: async () => {
      const res = await fetch(`/api/dispatch/${serviceBookingId}/share-text?audience=provider`);
      if (!res.ok) throw new Error("Failed to load provider dispatch text");
      return res.json();
    },
    enabled: !!serviceBookingId && isOpen,
  });

  const handleCopy = (text: string, tab: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Car className="w-5 h-5 text-emerald-600" />
            Share Dispatch &amp; Duty Information
          </DialogTitle>
          <DialogDescription className="text-xs">
            Audience-specific copy: Guest view hides supplier costs; Driver view hides client pricing.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="guest" className="pt-2">
          <TabsList className="grid grid-cols-3 bg-slate-100 p-1">
            <TabsTrigger value="guest" className="text-xs font-semibold gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Guest Copy
            </TabsTrigger>
            <TabsTrigger value="driver" className="text-xs font-semibold gap-1.5">
              <Car className="w-3.5 h-3.5 text-emerald-600" />
              Driver Copy
            </TabsTrigger>
            <TabsTrigger value="provider" className="text-xs font-semibold gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Provider Ref
            </TabsTrigger>
          </TabsList>

          {/* Guest Tab */}
          <TabsContent value="guest" className="space-y-3 pt-3">
            <div className="p-3 bg-slate-900 text-emerald-300 font-mono text-xs rounded-lg whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed border border-slate-800">
              {guestLoading ? "Loading guest dispatch text..." : guestData?.share_text}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(guestData?.share_text, "guest")}
                className="text-xs h-8 gap-1.5"
              >
                {copiedTab === "guest" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedTab === "guest" ? "Copied" : "Copy Text"}
              </Button>
              {guestData?.whatsapp_url && (
                <Button
                  size="sm"
                  onClick={() => window.open(guestData.whatsapp_url, "_blank")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Send via WhatsApp
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Driver Tab */}
          <TabsContent value="driver" className="space-y-3 pt-3">
            <div className="p-3 bg-slate-900 text-amber-300 font-mono text-xs rounded-lg whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed border border-slate-800">
              {driverLoading ? "Loading driver dispatch text..." : driverData?.share_text}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(driverData?.share_text, "driver")}
                className="text-xs h-8 gap-1.5"
              >
                {copiedTab === "driver" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedTab === "driver" ? "Copied" : "Copy Text"}
              </Button>
              {driverData?.whatsapp_url && (
                <Button
                  size="sm"
                  onClick={() => window.open(driverData.whatsapp_url, "_blank")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Send via WhatsApp
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Provider Tab */}
          <TabsContent value="provider" className="space-y-3 pt-3">
            <div className="p-3 bg-slate-900 text-purple-300 font-mono text-xs rounded-lg whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed border border-slate-800">
              {providerLoading ? "Loading provider text..." : providerData?.share_text}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(providerData?.share_text, "provider")}
                className="text-xs h-8 gap-1.5"
              >
                {copiedTab === "provider" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedTab === "provider" ? "Copied" : "Copy Text"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
