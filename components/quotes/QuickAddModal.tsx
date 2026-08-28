"use client";

import React, { useState } from "react";
import { useQuickAddStore } from "@/stores/quickAddStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hotel, Car, Compass, AlertCircle, Sparkles } from "lucide-react";

interface QuickAddModalProps {
  destinationId?: string;
}

export function QuickAddModal({ destinationId }: QuickAddModalProps) {
  const {
    isOpen,
    itemType,
    initialName,
    destinationId: storeDestId,
    closeQuickAdd,
    onItemCreatedCallback,
  } = useQuickAddStore();

  const [name, setName] = useState(initialName || "");
  const [costPrice, setCostPrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [starRating, setStarRating] = useState("4");
  const [roomType, setRoomType] = useState("Deluxe Room");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initialName when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setName(initialName || "");
      setErrorMsg(null);
    }
  }, [isOpen, initialName]);

  const effectiveDestId = destinationId || storeDestId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Item name is required.");
      return;
    }

    if (!effectiveDestId) {
      setErrorMsg("Destination ID is missing.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/inventory/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: itemType,
          name: name.trim(),
          destination_id: effectiveDestId,
          cost_price: parseFloat(costPrice) || 0,
          selling_price: parseFloat(sellingPrice) || parseFloat(costPrice) || 0,
          star_rating: parseInt(starRating, 10) || 4,
          room_type: roomType.trim() || "Deluxe Room",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create master data item");
      }

      if (onItemCreatedCallback) {
        onItemCreatedCallback(data.item);
      }

      closeQuickAdd();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeQuickAdd()}>
      <DialogContent className="sm:max-w-[440px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {itemType === "HOTEL" ? (
                <Hotel className="w-5 h-5 text-indigo-600" />
              ) : itemType === "TRANSPORT" ? (
                <Car className="w-5 h-5 text-emerald-600" />
              ) : (
                <Compass className="w-5 h-5 text-amber-600" />
              )}
              Quick Add {itemType === "HOTEL" ? "Hotel" : itemType === "TRANSPORT" ? "Vehicle" : "Activity"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Instantly create a master inventory record without losing any quote builder form state.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {errorMsg && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                {itemType === "HOTEL" ? "Hotel Name *" : itemType === "TRANSPORT" ? "Vehicle Type *" : "Activity Name *"}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  itemType === "HOTEL"
                    ? "e.g. Hotel Yak & Yeti"
                    : itemType === "TRANSPORT"
                    ? "e.g. Toyota HiAce (14 Seater)"
                    : "e.g. Everest Mountain Flight"
                }
                className="h-8 text-xs"
              />
            </div>

            {itemType === "HOTEL" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Star Rating</Label>
                  <select
                    value={starRating}
                    onChange={(e) => setStarRating(e.target.value)}
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md"
                  >
                    <option value="3">3 Star Standard</option>
                    <option value="4">4 Star Deluxe</option>
                    <option value="5">5 Star Luxury</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Room Category</Label>
                  <Input
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    placeholder="Deluxe Room"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cost Price (Supplier)</Label>
                <Input
                  type="number"
                  step="any"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Selling Price</Label>
                <Input
                  type="number"
                  step="any"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeQuickAdd}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-8 gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSubmitting ? "Creating..." : "Save & Add to Day"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
