import { prisma } from "@/lib/prisma";
import { AIEmailParseStatus, PlanRequestStatus, PlanRequestSource } from "@prisma/client";

export interface ExtractedEmailFields {
  guest_name: string | null;
  phone: string | null;
  email: string | null;
  destination: string | null;
  dates: string | null;
  pax: number | null;
  budget_hint: string | null;
  confidence_score: number; // 0.0 to 1.0
}

export interface ParseEmailParams {
  organization_id: string;
  from_address: string;
  subject?: string | null;
  body_text: string;
  raw_message_id?: string | null;
  confidence_threshold?: number;
}

/**
 * Schema-constrained prompt runner using Anthropic Claude (or heuristic fallback if API key absent).
 */
export async function extractFieldsWithClaude(
  subject: string,
  body: string,
  fromAddress: string
): Promise<ExtractedEmailFields> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (anthropicKey) {
    try {
      const prompt = `You are an expert travel inquiry parser for a Destination Management Company.
Extract the following travel inquiry parameters from the email below into strict valid JSON only without markdown fences:
{
  "guest_name": string or null,
  "phone": string or null,
  "email": string or null,
  "destination": string or null,
  "dates": string or null,
  "pax": integer or null,
  "budget_hint": string or null,
  "confidence_score": float between 0.0 and 1.0 representing how clearly these parameters were specified
}

Email Subject: ${subject}
From: ${fromAddress}
Email Body:
${body}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const textContent = json.content?.[0]?.text || "";
        const cleanJson = textContent.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
        const parsed = JSON.parse(cleanJson);
        return {
          guest_name: parsed.guest_name || null,
          phone: parsed.phone || null,
          email: parsed.email || fromAddress,
          destination: parsed.destination || null,
          dates: parsed.dates || null,
          pax: parsed.pax ? parseInt(parsed.pax, 10) : null,
          budget_hint: parsed.budget_hint || null,
          confidence_score: typeof parsed.confidence_score === "number" ? parsed.confidence_score : 0.8,
        };
      }
    } catch (err) {
      console.warn("[AIEmailParser] Claude API call failed, using heuristic extraction:", err);
    }
  }

  // Heuristic rule-based extractor (Fallback / Test Runner)
  return heuristicExtract(subject, body, fromAddress);
}

function heuristicExtract(
  subject: string,
  body: string,
  fromAddress: string
): ExtractedEmailFields {
  const text = `${subject} ${body}`;
  let confidenceScore = 0.4; // Base score for raw text

  // 1. Phone extraction
  const phoneMatch = text.match(/(?:\+?\d{1,4}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}|\+?\d{10,13}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : null;
  if (phone) confidenceScore += 0.15;

  // 2. Pax extraction
  const paxMatch = text.match(/(\d+)\s*(?:pax|people|adults|guests|persons|passengers)/i);
  const pax = paxMatch ? parseInt(paxMatch[1], 10) : null;
  if (pax) confidenceScore += 0.15;

  // 3. Destination extraction
  const destinations = ["Kathmandu", "Pokhara", "Everest", "Annapurna", "Chitwan", "Bhutan", "Tibet", "Vietnam", "Bali", "Ladakh", "Nepal"];
  let destination: string | null = null;
  for (const d of destinations) {
    if (new RegExp(`\\b${d}\\b`, "i").test(text)) {
      destination = d;
      confidenceScore += 0.15;
      break;
    }
  }

  // 4. Budget extraction
  const budgetMatch = text.match(/(?:\$|USD|INR|NPR|EUR|budget\s*(?:of|around|:)?\s*)\s*(\d+[\d,]*)/i);
  const budget_hint = budgetMatch ? budgetMatch[0].trim() : null;
  if (budget_hint) confidenceScore += 0.1;

  // 5. Name extraction
  const nameMatch = text.match(/(?:Hi|Dear|From|Name:?|Regards,?|Thanks,?)\s+([A-Z][a-z]+ [A-Z][a-z]+)/);
  const guest_name = nameMatch ? nameMatch[1].trim() : fromAddress.split("@")[0].replace(/[._]/g, " ");
  if (nameMatch) confidenceScore += 0.1;

  // 6. Dates extraction
  const datesMatch = text.match(/(?:in|during|dates?:?|from)\s+([A-Za-z]+ \d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Za-z]+ \d{1,2}(?:-\d{1,2})?)/i);
  const dates = datesMatch ? datesMatch[1].trim() : null;
  if (dates) confidenceScore += 0.05;

  return {
    guest_name,
    phone,
    email: fromAddress,
    destination,
    dates,
    pax,
    budget_hint,
    confidence_score: Math.min(1.0, Math.round(confidenceScore * 100) / 100),
  };
}

/**
 * Core AI Email Parsing Pipeline
 */
export async function processEmailThreadParsing(
  params: ParseEmailParams,
  dbClient: any = prisma
) {
  const threshold = params.confidence_threshold ?? 0.75;

  // 1. Always create the EmailThread record first, preserving the raw message body
  let emailThread = await dbClient.emailThread.create({
    data: {
      organization_id: params.organization_id,
      from_address: params.from_address,
      subject: params.subject || "Email Inquiry",
      body_text: params.body_text,
      raw_message_id: params.raw_message_id || null,
      ai_parse_status: AIEmailParseStatus.PENDING,
    },
  });

  try {
    // 2. Perform schema-constrained LLM / heuristic extraction
    const extracted = await extractFieldsWithClaude(
      params.subject || "",
      params.body_text,
      params.from_address
    );

    const isHighConfidence = extracted.confidence_score >= threshold;

    let tripPlanRequest: any = null;

    if (isHighConfidence) {
      // HIGH CONFIDENCE (>= threshold): Auto-creates TripPlanRequest in ASSIGNED or UNASSIGNED state
      tripPlanRequest = await dbClient.tripPlanRequest.create({
        data: {
          organization_id: params.organization_id,
          source: PlanRequestSource.EMAIL_INBOX,
          guest_name: extracted.guest_name || params.from_address,
          phone_number: extracted.phone || "N/A",
          email: extracted.email || params.from_address,
          destination_text: extracted.destination || "General Travel Inquiry",
          status: PlanRequestStatus.UNASSIGNED,
          raw_payload: extracted as any,
        },
      });

      // Update EmailThread with PARSED status
      emailThread = await dbClient.emailThread.update({
        where: { id: emailThread.id },
        data: {
          trip_plan_request_id: tripPlanRequest.id,
          ai_parse_status: AIEmailParseStatus.PARSED,
          ai_extracted_fields: extracted as any,
          ai_confidence_score: extracted.confidence_score,
        },
      });
    } else {
      // LOW CONFIDENCE (< threshold): Flag for human review in Trip Plan Requests inbox
      // CRITICAL TECHNICAL CONSTRAINT: NEVER AUTO-CREATE A FULL TRIP
      tripPlanRequest = await dbClient.tripPlanRequest.create({
        data: {
          organization_id: params.organization_id,
          source: PlanRequestSource.EMAIL_INBOX,
          guest_name: extracted.guest_name || params.from_address,
          phone_number: extracted.phone || "N/A",
          email: extracted.email || params.from_address,
          destination_text: extracted.destination || "Pending Human Review",
          status: PlanRequestStatus.UNASSIGNED,
          raw_payload: {
            ...extracted,
            needs_review_reason: `AI Confidence Score (${extracted.confidence_score}) below threshold (${threshold})`,
          },
        },
      });

      emailThread = await dbClient.emailThread.update({
        where: { id: emailThread.id },
        data: {
          trip_plan_request_id: tripPlanRequest.id,
          ai_parse_status: AIEmailParseStatus.LOW_CONFIDENCE_NEEDS_REVIEW,
          ai_extracted_fields: extracted as any,
          ai_confidence_score: extracted.confidence_score,
        },
      });
    }

    return {
      success: true,
      email_thread_id: emailThread.id,
      ai_parse_status: emailThread.ai_parse_status,
      confidence_score: extracted.confidence_score,
      is_high_confidence: isHighConfidence,
      extracted_fields: extracted,
      trip_plan_request_id: tripPlanRequest?.id || null,
      raw_email_preserved: true,
    };
  } catch (error: any) {
    // On unexpected error, preserve raw email and flag as FAILED
    await dbClient.emailThread.update({
      where: { id: emailThread.id },
      data: {
        ai_parse_status: AIEmailParseStatus.FAILED,
        ai_extracted_fields: { error: error.message || "Extraction failed" },
      },
    });

    return {
      success: false,
      email_thread_id: emailThread.id,
      ai_parse_status: AIEmailParseStatus.FAILED,
      error: error.message,
      raw_email_preserved: true,
    };
  }
}
