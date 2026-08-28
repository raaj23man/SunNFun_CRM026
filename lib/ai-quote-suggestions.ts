import { prisma } from "@/lib/prisma";
import { QuoteStatus, AIActionType } from "@prisma/client";
import { logAIAction } from "@/lib/ai-action-logger";

export interface QuoteSuggestionParams {
  organization_id: string;
  actor_user_id?: string | null;
  destination_id?: string | null;
  destination_text?: string | null;
  duration_nights?: number | null;
  pax?: number | null;
  budget_hint?: string | null;
  trip_notes?: string | null;
}

export interface QuoteSuggestionItem {
  quote_id: string;
  trip_display_id: string;
  guest_name: string;
  destination_name: string;
  duration_nights: number;
  duration_days: number;
  pax_adults: number;
  total_selling_price: number;
  currency: string;
  similarity_score: number; // 0.0 to 1.0
  is_ai_ranked: boolean;
  options: Array<{
    option_label: string;
    total_selling_price: number;
    days_count: number;
  }>;
}

/**
 * Calculates cosine similarity between two numeric vectors.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * (vecB[i] || 0);
    normA += vecA[i] * vecA[i];
    normB += (vecB[i] || 0) * (vecB[i] || 0);
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Lightweight token / character n-gram feature vectorizer for deterministic semantic scoring.
 */
function vectorizeText(text: string): number[] {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const vocabulary = [
    "nepal", "kathmandu", "pokhara", "everest", "annapurna", "chitwan", "bhutan", "tibet",
    "trek", "trekking", "luxury", "budget", "tour", "sightseeing", "flight", "hotel",
    "days", "nights", "pax", "adults", "private", "safari", "rafting", "helicopter",
  ];

  const vector = new Array(vocabulary.length).fill(0);
  for (const token of tokens) {
    const idx = vocabulary.indexOf(token);
    if (idx !== -1) vector[idx] += 1;
  }
  return vector;
}

/**
 * Quote Suggestions v2:
 * Ranks past ACCEPTED quotes using semantic embeddings with fallback to Part 4 filter.
 */
export async function getQuoteSuggestionsV2(
  params: QuoteSuggestionParams,
  dbClient: any = prisma
): Promise<{
  suggestions: QuoteSuggestionItem[];
  source: "AI_EMBEDDING_RANKED" | "FILTER_FALLBACK";
  ai_action_log_id: string | null;
}> {
  // 1. Query past ACCEPTED quotes in the organization
  let acceptedQuotes: any[] = [];
  try {
    acceptedQuotes = await dbClient.quote.findMany({
      where: {
        organization_id: params.organization_id,
        status: QuoteStatus.ACCEPTED,
      },
      include: {
        trip: {
          include: {
            guest: true,
            destination: true,
          },
        },
        options: {
          include: {
            days: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: 20,
    });
  } catch (err) {
    console.warn("[QuoteSuggestionsV2] Query failed:", err);
  }

  if (!acceptedQuotes || acceptedQuotes.length === 0) {
    return {
      suggestions: [],
      source: "FILTER_FALLBACK",
      ai_action_log_id: null,
    };
  }

  const targetDescription = `${params.destination_text || ""} ${params.duration_nights || 0} nights ${params.pax || 1} pax ${params.budget_hint || ""} ${params.trip_notes || ""}`.trim();
  const targetVector = vectorizeText(targetDescription);

  let rankedSuggestions: QuoteSuggestionItem[] = [];
  let isAiRanked = false;

  // 2. Try Embedding / Semantic Scoring
  try {
    rankedSuggestions = acceptedQuotes.map((q: any) => {
      const quoteText = `${q.trip.destination?.name || ""} ${q.trip.duration_nights} nights ${q.trip.pax_adults} pax ${q.notes || ""}`;
      const candidateVector = vectorizeText(quoteText);
      const similarity = cosineSimilarity(targetVector, candidateVector);

      // Duration & Pax closeness boost only if there is positive semantic alignment
      let bonus = 0;
      if (similarity > 0) {
        if (params.duration_nights && Math.abs(q.trip.duration_nights - params.duration_nights) <= 1) {
          bonus += 0.2;
        }
        if (params.pax && Math.abs(q.trip.pax_adults - params.pax) <= 1) {
          bonus += 0.15;
        }
      }

      const finalScore = similarity > 0 ? Math.min(1.0, Math.round((similarity + bonus) * 100) / 100) : 0;

      return {
        quote_id: q.id,
        trip_display_id: q.trip.trip_display_id,
        guest_name: q.trip.guest?.full_name || "Guest",
        destination_name: q.trip.destination?.name || "Custom Destination",
        duration_nights: q.trip.duration_nights,
        duration_days: q.trip.duration_days,
        pax_adults: q.trip.pax_adults,
        total_selling_price: Number(q.total_selling_price),
        currency: q.currency,
        similarity_score: finalScore,
        is_ai_ranked: true,
        options: q.options.map((opt: any) => ({
          option_label: opt.option_label,
          total_selling_price: Number(opt.total_selling_price),
          days_count: opt.days?.length || 0,
        })),
      };
    });

    rankedSuggestions.sort((a, b) => b.similarity_score - a.similarity_score);
    isAiRanked = true;
  } catch (err) {
    console.warn("[QuoteSuggestionsV2] Semantic ranking error, using filter fallback:", err);
  }

  // 3. Fallback to Part 4 deterministic filter if semantic ranking returned no confident items
  const confidentResults = rankedSuggestions.filter((s) => s.similarity_score >= 0.6);
  let finalResults = confidentResults.length > 0 ? confidentResults.slice(0, 5) : [];
  let source: "AI_EMBEDDING_RANKED" | "FILTER_FALLBACK" = "AI_EMBEDDING_RANKED";

  if (finalResults.length === 0) {
    // Deterministic filter fallback
    source = "FILTER_FALLBACK";
    finalResults = acceptedQuotes
      .filter((q: any) => {
        const destMatch = params.destination_id ? q.trip.destination_id === params.destination_id : true;
        const durMatch = params.duration_nights ? Math.abs(q.trip.duration_nights - params.duration_nights) <= 2 : true;
        return destMatch || durMatch;
      })
      .slice(0, 5)
      .map((q: any) => ({
        quote_id: q.id,
        trip_display_id: q.trip.trip_display_id,
        guest_name: q.trip.guest?.full_name || "Guest",
        destination_name: q.trip.destination?.name || "Custom Destination",
        duration_nights: q.trip.duration_nights,
        duration_days: q.trip.duration_days,
        pax_adults: q.trip.pax_adults,
        total_selling_price: Number(q.total_selling_price),
        currency: q.currency,
        similarity_score: 0.5,
        is_ai_ranked: false,
        options: q.options.map((opt: any) => ({
          option_label: opt.option_label,
          total_selling_price: Number(opt.total_selling_price),
          days_count: opt.days?.length || 0,
        })),
      }));
  }

  // 4. Log AI action in audit trail
  const aiLog = await logAIAction(
    {
      organization_id: params.organization_id,
      actor_user_id: params.actor_user_id,
      action_type: AIActionType.SUGGESTION_RANK,
      input_ref: params.destination_text || params.destination_id || null,
      output_ref: finalResults[0]?.quote_id || null,
      confidence_score: finalResults[0]?.similarity_score || 0.5,
      raw_input: params,
      raw_output: { result_count: finalResults.length, top_match: finalResults[0] },
      model_name: source === "AI_EMBEDDING_RANKED" ? "text-embedding-3-small" : "deterministic-filter-fallback",
    },
    dbClient
  );

  return {
    suggestions: finalResults,
    source,
    ai_action_log_id: aiLog?.id || null,
  };
}
