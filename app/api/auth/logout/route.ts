import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    clearSessionCookie();
    return NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error: any) {
    console.error("[Logout Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log out." },
      { status: 500 }
    );
  }
}
