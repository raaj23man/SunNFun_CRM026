"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QuoteBuilder } from "@/components/quotes/QuoteBuilder";
import { Compass, Plus, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TripQuotesPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const tripId = params.id as string;

  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);

  // Fetch Trip details and existing Quotes
  const { data: tripData, isLoading: tripLoading } = useQuery({
    queryKey: ["trip-details", tripId],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}`);
      if (!res.ok) throw new Error("Failed to load trip");
      return res.json();
    },
  });

  const trip = tripData?.trip;

  // Create Quote Mutation
  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/trips/${tripId}/quotes`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create quote");
      return data;
    },
    onSuccess: (data) => {
      setActiveQuoteId(data.quote.id);
      queryClient.invalidateQueries({ queryKey: ["trip-details", tripId] });
    },
  });

  // Fetch Active Quote Details
  const currentQuoteId = activeQuoteId || trip?.quotes?.[0]?.id;

  const { data: quoteData, isLoading: quoteLoading } = useQuery({
    queryKey: ["quote-details", currentQuoteId],
    queryFn: async () => {
      if (!currentQuoteId) return null;
      const res = await fetch(`/api/quotes/${currentQuoteId}`);
      if (!res.ok) throw new Error("Failed to load quote");
      return res.json();
    },
    enabled: !!currentQuoteId,
  });

  if (tripLoading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading trip itinerary...</div>;
  }

  if (!trip) {
    return <div className="p-12 text-center text-xs text-red-500">Trip not found.</div>;
  }

  // If no quotes exist yet, show "Create First Proposal" screen
  if (!trip.quotes || trip.quotes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <Compass className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">No Quotations Created Yet</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Initialize a customized day-by-day tour quotation for {trip.guest?.full_name} with {trip.duration_days} days itinerary skeleton.
        </p>

        <Button
          size="sm"
          disabled={createQuoteMutation.isPending}
          onClick={() => createQuoteMutation.mutate()}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 gap-1.5 font-semibold"
        >
          <Sparkles className="w-4 h-4" />
          {createQuoteMutation.isPending ? "Generating Skeleton..." : "Create First Proposal (v1)"}
        </Button>
      </div>
    );
  }

  if (quoteLoading || !quoteData?.quote) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading quote builder...</div>;
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <QuoteBuilder quote={quoteData.quote} />
    </div>
  );
}
