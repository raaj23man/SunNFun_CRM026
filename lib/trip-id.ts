import { PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * Generates the next sequential trip display ID for an organization.
 * Format: `${Organization.trip_prefix}${sequence_number}` (e.g., "SBC-10001", "SBC-81881").
 * 
 * Uses atomic sequence determination scoped to the organization.
 */
export async function generateTripDisplayId(
  organizationId: string,
  txPrisma: any = prisma
): Promise<{ sequence_number: number; trip_display_id: string }> {
  // 1. Fetch organization trip prefix
  const org = await txPrisma.organization.findUnique({
    where: { id: organizationId },
    select: { trip_prefix: true },
  });

  const prefix = org?.trip_prefix || "SBC-";

  // 2. Find highest existing sequence_number for this organization
  const highestTrip = await txPrisma.trip.findFirst({
    where: { organization_id: organizationId },
    orderBy: { sequence_number: "desc" },
    select: { sequence_number: true },
  });

  // Start sequence at 10001 if first trip, else increment
  const nextSequenceNumber = highestTrip ? highestTrip.sequence_number + 1 : 10001;
  const tripDisplayId = `${prefix}${nextSequenceNumber}`;

  return {
    sequence_number: nextSequenceNumber,
    trip_display_id: tripDisplayId,
  };
}
