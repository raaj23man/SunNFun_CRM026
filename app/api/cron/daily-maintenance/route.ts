import { NextRequest, NextResponse } from "next/server";
import { runDailySystemMaintenance } from "@/lib/cron-maintenance";

/**
 * POST /api/cron/daily-maintenance
 * Daily 01:00 Kathmandu-time cron endpoint (triggered by Vercel Cron, QStash, or n8n).
 * Scans overdue accounts and archives trips older than 1 year.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is configured, enforce bearer token verification
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
    }

    const result = await runDailySystemMaintenance();

    return NextResponse.json({
      success: true,
      message: "Daily system maintenance completed successfully.",
      ...result,
    });
  } catch (error: any) {
    console.error("Error running daily cron maintenance:", error);
    return NextResponse.json({ error: error.message || "Maintenance job failed" }, { status: 500 });
  }
}
