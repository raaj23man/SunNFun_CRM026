import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

/**
 * POST /api/guests/:id/documents/request-upload
 * Generates a secure, single-use upload link token for the guest to upload passports/visas.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const guestId = params?.id as string;

    if (!guestId) {
      throw new BadRequestError("Guest ID parameter is required.");
    }

    const guest = await scopedPrisma.guest.findUnique({
      where: { id: guestId },
    });

    if (!guest) {
      throw new NotFoundError("Guest not found.");
    }

    // Generate random 24-byte hex token
    const token = crypto.randomBytes(16).toString("hex");

    // Pre-create document placeholder record with token
    const document = await scopedPrisma.guestDocument.create({
      data: {
        guest_id: guestId,
        document_type: "PASSPORT",
        file_url: "pending_upload",
        uploaded_via: "SELF_SERVICE_LINK",
        upload_link_token: token,
      },
    });

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const uploadUrl = `${origin}/upload-documents?token=${token}`;

    return NextResponse.json({
      success: true,
      token,
      uploadUrl,
      guest_name: guest.full_name,
      message: "Secure upload link generated successfully.",
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "SALES_PERSON", "OPERATIONS"],
  }
);
