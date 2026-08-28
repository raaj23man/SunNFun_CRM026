"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Compass,
  Hotel,
  Car,
  Plane,
  Plus,
  Trash2,
  Save,
  Share2,
  ArrowRight,
  Layers,
  Sparkles,
  Calendar,
  DollarSign,
  Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PricingMarkupPanel } from "./PricingMarkupPanel";
import { QuickAddModal } from "./QuickAddModal";
import { SharePackageModal } from "./SharePackageModal";
import { useQuickAddStore, QuickAddType } from "@/stores/quickAddStore";
import { calculateQuotePricing, PricingStrategy, MarkupType, TaxBasis } from "@/lib/quote-pricing";

interface QuoteBuilderProps {
  quote: any;
  onSaved?: () => void;
}

export function QuoteBuilder({ quote, onSaved }: QuoteBuilderProps) {
  const queryClient = useQueryClient();
  const { openQuickAdd, setOnItemCreatedCallback } = useQuickAddStore();

  const [activeOptionTab, setActiveOptionTab] = useState(
    quote.options?.[0]?.option_label || "Standard"
  );
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Form setup
  const { register, control, watch, setValue, getValues, handleSubmit } = useForm({
    defaultValues: {
      pricing_strategy: (quote.pricing_strategy as PricingStrategy) || "OVERALL",
      overall_markup_type: (quote.overall_markup_type as MarkupType) || "PERCENT",
      overall_markup_value: quote.overall_markup_value ? Number(quote.overall_markup_value) : 15,
      options: quote.options || [],
    },
  });

  const { fields: optionFields, append: appendOption } = useFieldArray({
    control,
    name: "options",
  });

  const currentOptions = watch("options");
  const currentStrategy = watch("pricing_strategy");
  const currentMarkupType = watch("overall_markup_type");
  const currentMarkupValue = watch("overall_markup_value");

  // Real-time pricing calculation
  const calculatedPricing = calculateQuotePricing({
    pax_adults: quote.trip?.pax_adults || 2,
    pax_children: quote.trip?.pax_children || 0,
    pricing_strategy: currentStrategy,
    overall_markup_type: currentMarkupType,
    overall_markup_value: currentMarkupValue,
    options: currentOptions || [],
  });

  const activeOptionCalculated =
    calculatedPricing.options.find((o) => o.option_label === activeOptionTab) ||
    calculatedPricing.options[0] || {
      total_cost_price: 0,
      total_selling_price: 0,
      margin_amount: 0,
      margin_percentage: 0,
    };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save quote");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-details", quote.id] });
      queryClient.invalidateQueries({ queryKey: ["trip-details"] });
      if (onSaved) onSaved();
    },
  });

  const onFormSubmit = (data: any) => {
    saveMutation.mutate(data);
  };

  // Duplicate option tier (e.g. Standard -> Luxury)
  const handleAddOptionTier = (tierName: string) => {
    const defaultOpt = currentOptions[0] || { days: [] };
    const clonedDays = JSON.parse(JSON.stringify(defaultOpt.days || []));
    appendOption({
      id: `temp-${Date.now()}`,
      option_label: tierName,
      is_default: false,
      days: clonedDays,
    });
    setActiveOptionTab(tierName);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-lg text-slate-900">
              {quote.trip?.trip_display_id} — Quote v{quote.version}
            </span>
            <span className="text-xs bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded">
              {quote.status}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {quote.trip?.guest?.full_name} • {quote.trip?.destination?.name} ({quote.trip?.duration_nights}N, {quote.trip?.duration_days}D)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShareModalOpen(true)}
            className="h-8 text-xs gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Proposal
          </Button>

          <Button
            size="sm"
            disabled={saveMutation.isPending}
            onClick={handleSubmit(onFormSubmit)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? "Saving..." : "Save Itinerary"}
          </Button>
        </div>
      </div>

      {/* Main Grid: Left (Itinerary Days Builder) | Right (Pricing Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Days & Services */}
        <div className="lg:col-span-2 space-y-6">
          {/* Multi-Option Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              {optionFields.map((optField, optIndex) => {
                const optValue = currentOptions[optIndex];
                const label = optValue?.option_label || `Option ${optIndex + 1}`;
                const isActive = activeOptionTab === label;

                return (
                  <Button
                    key={optField.id}
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    onClick={() => setActiveOptionTab(label)}
                    className={`h-8 text-xs font-semibold ${
                      isActive ? "bg-slate-900 text-white" : "bg-white text-slate-700"
                    }`}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddOptionTier(`Option ${optionFields.length + 1}`)}
              className="h-7 text-xs gap-1 border-dashed text-slate-600"
            >
              <Plus className="w-3 h-3" /> Add Tier Option
            </Button>
          </div>

          {/* Render Days for Active Option */}
          {optionFields.map((optField, optIndex) => {
            const optValue = currentOptions[optIndex];
            const label = optValue?.option_label || `Option ${optIndex + 1}`;
            if (label !== activeOptionTab) return null;

            return (
              <div key={optField.id} className="space-y-4">
                {(optValue?.days || []).map((day: any, dayIndex: number) => (
                  <Card key={day.id || dayIndex} className="border-slate-200 shadow-sm bg-white">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="bg-slate-900 text-white text-[11px] font-bold px-2 py-0.5 rounded">
                          Day {day.day_number || dayIndex + 1}
                        </span>
                        <Input
                          {...register(`options.${optIndex}.days.${dayIndex}.title`)}
                          placeholder="Day Title (e.g. Arrival & City Tour)"
                          className="h-7 text-xs font-semibold bg-white flex-1 max-w-sm"
                        />
                      </div>

                      {/* Quick Add buttons for this day */}
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setOnItemCreatedCallback((newItem) => {
                              const currentItems = getValues(`options.${optIndex}.days.${dayIndex}.items`) || [];
                              setValue(`options.${optIndex}.days.${dayIndex}.items`, [
                                ...currentItems,
                                {
                                  id: `temp-${Date.now()}`,
                                  item_type: newItem.type,
                                  inventory_id: newItem.id,
                                  custom_name: newItem.name,
                                  cost_price: newItem.cost_price,
                                  selling_price: newItem.selling_price || newItem.cost_price,
                                  is_foc: false,
                                  markup_type: "PERCENT",
                                  markup_value: 15,
                                  tax_basis: "COST_PLUS_MARKUP",
                                },
                              ]);
                            });
                            openQuickAdd({
                              type: "HOTEL",
                              dayIndex,
                              itemIndex: 0,
                              destinationId: quote.trip?.destination_id,
                            });
                          }}
                          className="h-6 text-[10px] gap-1 bg-white"
                        >
                          <Hotel className="w-2.5 h-2.5 text-indigo-600" />
                          + Hotel
                        </Button>

                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setOnItemCreatedCallback((newItem) => {
                              const currentItems = getValues(`options.${optIndex}.days.${dayIndex}.items`) || [];
                              setValue(`options.${optIndex}.days.${dayIndex}.items`, [
                                ...currentItems,
                                {
                                  id: `temp-${Date.now()}`,
                                  item_type: newItem.type,
                                  inventory_id: newItem.id,
                                  custom_name: newItem.name,
                                  cost_price: newItem.cost_price,
                                  selling_price: newItem.selling_price || newItem.cost_price,
                                  is_foc: false,
                                  markup_type: "FLAT",
                                  markup_value: 20,
                                  tax_basis: "COST_PLUS_MARKUP",
                                },
                              ]);
                            });
                            openQuickAdd({
                              type: "TRANSPORT",
                              dayIndex,
                              itemIndex: 0,
                              destinationId: quote.trip?.destination_id,
                            });
                          }}
                          className="h-6 text-[10px] gap-1 bg-white"
                        >
                          <Car className="w-2.5 h-2.5 text-emerald-600" />
                          + Transport
                        </Button>

                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setOnItemCreatedCallback((newItem) => {
                              const currentItems = getValues(`options.${optIndex}.days.${dayIndex}.items`) || [];
                              setValue(`options.${optIndex}.days.${dayIndex}.items`, [
                                ...currentItems,
                                {
                                  id: `temp-${Date.now()}`,
                                  item_type: newItem.type,
                                  inventory_id: newItem.id,
                                  custom_name: newItem.name,
                                  cost_price: newItem.cost_price,
                                  selling_price: newItem.selling_price || newItem.cost_price,
                                  is_foc: false,
                                  markup_type: "PERCENT",
                                  markup_value: 10,
                                  tax_basis: "COST_PLUS_MARKUP",
                                },
                              ]);
                            });
                            openQuickAdd({
                              type: "ACTIVITY",
                              dayIndex,
                              itemIndex: 0,
                              destinationId: quote.trip?.destination_id,
                            });
                          }}
                          className="h-6 text-[10px] gap-1 bg-white"
                        >
                          <Compass className="w-2.5 h-2.5 text-amber-600" />
                          + Activity
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      {/* Day Description */}
                      <textarea
                        {...register(`options.${optIndex}.days.${dayIndex}.description`)}
                        placeholder="Day narrative and sightseeing highlights..."
                        rows={2}
                        className="w-full p-2 text-xs bg-slate-50/50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />

                      {/* Items List */}
                      <div className="space-y-2">
                        {(day.items || []).map((item: any, itemIndex: number) => (
                          <div
                            key={item.id || itemIndex}
                            className={`p-2.5 rounded-lg border text-xs space-y-2 transition-all ${
                              item.is_foc ? "bg-emerald-50/30 border-emerald-200" : "bg-white border-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  {item.item_type}
                                </span>
                                <Input
                                  {...register(`options.${optIndex}.days.${dayIndex}.items.${itemIndex}.custom_name`)}
                                  placeholder="Service name (e.g. Hotel Yak & Yeti CP)"
                                  className="h-7 text-xs font-semibold flex-1"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-[11px]">
                                  <label className="text-slate-500">FOC</label>
                                  <input
                                    type="checkbox"
                                    {...register(`options.${optIndex}.days.${dayIndex}.items.${itemIndex}.is_foc`)}
                                    className="rounded border-slate-300"
                                  />
                                </div>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const currentItems = getValues(`options.${optIndex}.days.${dayIndex}.items`) || [];
                                    setValue(
                                      `options.${optIndex}.days.${dayIndex}.items`,
                                      currentItems.filter((_: any, idx: number) => idx !== itemIndex)
                                    );
                                  }}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Cost, Markup, Selling Controls */}
                            <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100 items-center">
                              <div>
                                <Label className="text-[10px] text-slate-500 block">Cost Price</Label>
                                <Input
                                  type="number"
                                  step="any"
                                  {...register(`options.${optIndex}.days.${dayIndex}.items.${itemIndex}.cost_price`)}
                                  className="h-7 text-xs font-mono"
                                />
                              </div>

                              {currentStrategy.startsWith("PER_COMPONENT") && (
                                <>
                                  <div>
                                    <Label className="text-[10px] text-slate-500 block">Markup Type</Label>
                                    <select
                                      {...register(`options.${optIndex}.days.${dayIndex}.items.${itemIndex}.markup_type`)}
                                      className="w-full h-7 px-1 text-xs bg-white border border-slate-200 rounded"
                                    >
                                      <option value="PERCENT">% Percent</option>
                                      <option value="FLAT">Flat Val</option>
                                    </select>
                                  </div>

                                  <div>
                                    <Label className="text-[10px] text-slate-500 block">Markup Val</Label>
                                    <Input
                                      type="number"
                                      step="any"
                                      {...register(`options.${optIndex}.days.${dayIndex}.items.${itemIndex}.markup_value`)}
                                      className="h-7 text-xs font-mono"
                                    />
                                  </div>
                                </>
                              )}

                              <div>
                                <Label className="text-[10px] text-slate-500 block">Selling Price</Label>
                                <Input
                                  type="number"
                                  step="any"
                                  disabled={item.is_foc}
                                  {...register(`options.${optIndex}.days.${dayIndex}.items.${itemIndex}.selling_price`)}
                                  className={`h-7 text-xs font-mono font-bold ${
                                    item.is_foc ? "bg-slate-100 text-slate-400" : "bg-white text-slate-900"
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}
        </div>

        {/* Right Column: Pricing & Markup Panel */}
        <div className="space-y-4">
          <PricingMarkupPanel
            strategy={currentStrategy}
            onStrategyChange={(s) => setValue("pricing_strategy", s)}
            markupType={currentMarkupType}
            onMarkupTypeChange={(m) => setValue("overall_markup_type", m)}
            markupValue={currentMarkupValue}
            onMarkupValueChange={(v) => setValue("overall_markup_value", v)}
            totalCost={activeOptionCalculated.total_cost_price}
            totalSelling={activeOptionCalculated.total_selling_price}
            marginAmount={activeOptionCalculated.margin_amount}
            marginPercentage={activeOptionCalculated.margin_percentage}
            currency={quote.currency || "USD"}
            paxCount={Math.max(1, (quote.trip?.pax_adults || 0) + (quote.trip?.pax_children || 0))}
          />
        </div>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal destinationId={quote.trip?.destination_id} />

      {/* Share Package Modal */}
      <SharePackageModal
        quoteId={quote.id}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
}
