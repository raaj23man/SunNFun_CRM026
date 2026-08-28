import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processEmailThreadParsing } from "@/lib/ai-email-parser";

const parseEmailSchema = z.object({
  organization_id: z.string().min(1, "Organization ID is required"),
  from_address: z.string().email("Invalid sender email address"),
  subject: z.string().nullable().optional(),
  body_text: z.string().min(1, "Email body text is required"),
  raw_message_id: z.string().nullable().optional(),
  confidence_threshold: z.number().min(0).max(1).optional(),
});

/**
 * POST /api/ai/parse-email
 * Internal AI parsing endpoint called by n8n or IMAP workers after email capture.
 * Extracts inquiry entities with Claude/LLM and branches by confidence threshold.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = parseEmailSchema.parse(body);

    const result = await processEmailThreadParsing({
      organization_id: validated.organization_id,
      from_address: validated.from_address,
      subject: validated.subject,
      body_text: validated.body_text,
      raw_message_id: validated.raw_message_id,
      confidence_threshold: validated.confidence_threshold,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in AI email parsing endpoint:", error);
    return NextResponse.json({ error: error.message || "Failed to parse email" }, { status: 400 });
  }
}
