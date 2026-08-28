"use client";

import React from "react";
import { DollarSign, Percent, Calculator, Info, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PricingStrategy, MarkupType } from "@/lib/quote-pricing";

interface PricingMarkupPanelProps {
  strategy: PricingStrategy;
  onStrategyChange: (newStrategy: PricingStrategy) => void;
  markupType: MarkupType;
  onMarkupTypeChange: (type: MarkupType) => void;
  markupValue: number;
  onMarkupValueChange: (val: number) => void;
  totalCost: number;
  totalSelling: number;
  marginAmount: number;
  marginPercentage: number;
  currency: string;
  paxCount: number;
}

export function PricingMarkupPanel({
  strategy,
  onStrategyChange,
  markupType,
  onMarkupTypeChange,
  markupValue,
  onMarkupValueChange,
  totalCost,
  totalSelling,
  marginAmount,
  marginPercentage,
  currency,
  paxCount,
}: PricingMarkupPanelProps) {
  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider text-slate-700">
          <Calculator className="w-4 h-4 text-emerald-600" />
          Pricing &amp; Margin Strategy
        </CardTitle>

        <span className="text-[11px] font-mono text-slate-500">
          {paxCount} {paxCount === 1 ? "Traveler" : "Travelers"}
        </span>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Strategy Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-800">Active Pricing Strategy</Label>
          <select
            value={strategy}
            onChange={(e) => onStrategyChange(e.target.value as PricingStrategy)}
            className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="OVERALL">1. Overall Itinerary Markup (Standard)</option>
            <option value="PER_PERSON">2. Per-Person Markup (Group Split)</option>
            <option value="PER_COMPONENT">3. Per-Component Markup (Item Level)</option>
            <option value="PER_COMPONENT_PER_PERSON">4. Per-Component Per-Person (Granular)</option>
          </select>
        </div>

        {/* Global Markup Controls for OVERALL & PER_PERSON */}
        {["OVERALL", "PER_PERSON"].includes(strategy) && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {strategy === "OVERALL" ? "Overall Package Markup" : "Per-Person Markup"}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Markup Type</Label>
                <select
                  value={markupType}
                  onChange={(e) => onMarkupTypeChange(e.target.value as MarkupType)}
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md"
                >
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="FLAT">Flat Amount ({currency})</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">
                  {markupType === "PERCENT" ? "Markup Percentage" : `Markup Value (${currency})`}
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={markupValue}
                  onChange={(e) => onMarkupValueChange(parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-mono bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Cost</div>
            <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
              {currency} {totalCost.toLocaleString()}
            </div>
          </div>

          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="text-[10px] text-emerald-800 font-semibold uppercase">Selling Price</div>
            <div className="text-sm font-mono font-extrabold text-emerald-950 mt-0.5">
              {currency} {totalSelling.toLocaleString()}
            </div>
          </div>

          <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-[10px] text-blue-800 font-semibold uppercase">Profit Margin</div>
            <div className="text-xs font-mono font-bold text-blue-950 mt-0.5">
              {currency} {marginAmount.toLocaleString()} ({marginPercentage}%)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
