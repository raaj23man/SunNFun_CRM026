"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Share2,
  Phone,
  Mail,
  FileText,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sliders,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SharePackageModalProps {
  quoteId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SharePackageModal({ quoteId, isOpen, onClose }: SharePackageModalProps) {
  // Sembark 4 Toggles
  const [hideTotalPrice, setHideTotalPrice] = useState(false);
  const [includeItinerary, setIncludeItinerary] = useState(true);
  const [removeTerms, setRemoveTerms] = useState(false);
  const [useSimilarHotelWording, setUseSimilarHotelWording] = useState(false);

  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Fetch formatted WhatsApp and Email payloads
  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "quote-share-preview",
      quoteId,
      hideTotalPrice,
      includeItinerary,
      removeTerms,
      useSimilarHotelWording,
    ],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${quoteId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toggles: {
            hideTotalPrice,
            includeItinerary,
            removeTerms,
            useSimilarHotelWording,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to load share payload");
      return res.json();
    },
    enabled: isOpen,
  });

  const handleCopyWhatsApp = () => {
    if (data?.whatsappText) {
      navigator.clipboard.writeText(data.whatsappText);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2000);
    }
  };

  const handleDownloadPdf = async (isBranded = true) => {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_branded: isBranded,
          toggles: {
            hideTotalPrice,
            includeItinerary,
            removeTerms,
            useSimilarHotelWording,
          },
        }),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quote-${quoteId.slice(0, 8)}${isBranded ? "" : "-Unbranded"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert("Error generating PDF: " + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-600" />
            Share Tour Proposal
          </DialogTitle>
          <DialogDescription className="text-xs">
            Export quotation as WhatsApp text, branded email, or vector PDF.
          </DialogDescription>
        </DialogHeader>

        {/* 4 Sembark Toggles */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Sliders className="w-3 h-3 text-slate-400" />
            Sharing Visibility Toggles
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-200/80">
              <Label htmlFor="toggle-hide-price" className="text-[11px] text-slate-700 cursor-pointer">
                Hide Total Price
              </Label>
              <Switch
                id="toggle-hide-price"
                checked={hideTotalPrice}
                onCheckedChange={setHideTotalPrice}
              />
            </div>

            <div className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-200/80">
              <Label htmlFor="toggle-include-itinerary" className="text-[11px] text-slate-700 cursor-pointer">
                Include Day Itinerary
              </Label>
              <Switch
                id="toggle-include-itinerary"
                checked={includeItinerary}
                onCheckedChange={setIncludeItinerary}
              />
            </div>

            <div className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-200/80">
              <Label htmlFor="toggle-remove-terms" className="text-[11px] text-slate-700 cursor-pointer">
                Remove Terms
              </Label>
              <Switch
                id="toggle-remove-terms"
                checked={removeTerms}
                onCheckedChange={setRemoveTerms}
              />
            </div>

            <div className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-200/80">
              <Label htmlFor="toggle-similar-hotels" className="text-[11px] text-slate-700 cursor-pointer">
                &quot;Or Similar&quot; Hotel Suffix
              </Label>
              <Switch
                id="toggle-similar-hotels"
                checked={useSimilarHotelWording}
                onCheckedChange={setUseSimilarHotelWording}
              />
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <Tabs defaultValue="whatsapp" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3 bg-slate-100 p-1">
            <TabsTrigger value="whatsapp" className="text-xs font-semibold gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp Text
            </TabsTrigger>
            <TabsTrigger value="email" className="text-xs font-semibold gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              Email HTML
            </TabsTrigger>
            <TabsTrigger value="pdf" className="text-xs font-semibold gap-1.5">
              <FileText className="w-3.5 h-3.5 text-red-600" />
              Download PDF
            </TabsTrigger>
          </TabsList>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp" className="flex-1 flex flex-col space-y-3 pt-2 min-h-0">
            <div className="flex-1 overflow-y-auto p-3 bg-slate-900 text-emerald-300 font-mono text-xs rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed max-h-60">
              {isLoading ? "Generating WhatsApp text..." : data?.whatsappText}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyWhatsApp}
                className="text-xs h-8 gap-1.5"
              >
                {copiedWhatsApp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedWhatsApp ? "Copied!" : "Copy Text"}
              </Button>

              {data?.whatsappUrl && (
                <Button
                  size="sm"
                  onClick={() => window.open(data.whatsappUrl, "_blank")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open WhatsApp
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="flex-1 flex flex-col space-y-3 pt-2 min-h-0">
            <div className="flex-1 overflow-y-auto p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs max-h-60">
              {isLoading ? (
                <div className="p-4 text-center text-slate-400">Rendering email preview...</div>
              ) : (
                <iframe
                  srcDoc={data?.emailHtml}
                  title="Email Preview"
                  className="w-full h-56 border-0 bg-white rounded"
                />
              )}
            </div>
          </TabsContent>

          {/* PDF Tab */}
          <TabsContent value="pdf" className="flex-1 flex flex-col space-y-4 pt-4 min-h-0">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">High-Resolution Vector PDF (Server-Rendered)</div>
              <p className="text-[11px] text-slate-500">
                Generated strictly server-side using Chromium Puppeteer for crystal clear typography and perfect page breaks.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  size="sm"
                  disabled={downloadingPdf}
                  onClick={() => handleDownloadPdf(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloadingPdf ? "Rendering PDF..." : "Download Branded PDF"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={downloadingPdf}
                  onClick={() => handleDownloadPdf(false)}
                  className="text-xs h-9 gap-1.5 border-slate-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Non-Branded (B2B)
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
