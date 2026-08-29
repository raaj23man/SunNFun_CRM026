import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";

/**
 * GET /api/dashboard/notifications
 * Generates an dynamic feed of alerts:
 * 1. Overdue follow-ups
 * 2. Uncompleted task assignments
 * 3. Stale lead warnings (IN_PROGRESS untouched for 3+ days)
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const today = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);

    const notifications: Array<{
      id: string;
      type: "FOLLOW_UP" | "TASK" | "STALE_LEAD";
      title: string;
      message: string;
      time: string;
      link: string;
      severity: "warning" | "info" | "urgent";
    }> = [];

    try {
      // 1. Pending overdue follow-ups
      const overdueFollowUps = await scopedPrisma.followUp.findMany({
        where: {
          trip: { organization_id: user.organization_id },
          assigned_to_user_id: user.id,
          status: "PENDING",
          due_date: { lt: today },
        },
        include: {
          trip: {
            select: { id: true, trip_display_id: true, guest: { select: { full_name: true } } },
          },
        },
        take: 5,
      });

      for (const f of overdueFollowUps) {
        notifications.push({
          id: `fu-${f.id}`,
          type: "FOLLOW_UP",
          title: `Overdue Follow-up: ${f.trip.trip_display_id}`,
          message: `Follow-up with ${f.trip.guest.full_name} is overdue. Remarks: "${f.remarks}"`,
          time: f.due_date.toISOString(),
          link: `/trips/${f.trip.id}`,
          severity: "urgent",
        });
      }

      // 2. Assigned tasks
      const assignedTasks = await scopedPrisma.tripTask.findMany({
        where: {
          trip: { organization_id: user.organization_id },
          assigned_to_user_id: user.id,
          is_completed: false,
        },
        include: {
          trip: { select: { id: true, trip_display_id: true } },
          created_by: { select: { first_name: true, last_name: true } },
        },
        take: 5,
      });

      for (const t of assignedTasks) {
        notifications.push({
          id: `task-${t.id}`,
          type: "TASK",
          title: `Task for ${t.trip.trip_display_id}`,
          message: `${t.created_by.first_name} assigned: "${t.content}"`,
          time: t.created_at.toISOString(),
          link: `/trips/${t.trip.id}`,
          severity: "info",
        });
      }

      // 3. Stale lead warnings (IN_PROGRESS untouched for 3+ days)
      const staleTrips = await scopedPrisma.trip.findMany({
        where: {
          organization_id: user.organization_id,
          assigned_user_id: user.role === "SALES_PERSON" ? user.id : undefined,
          status: "IN_PROGRESS",
          updated_at: { lt: threeDaysAgo },
        },
        include: {
          guest: { select: { full_name: true } },
        },
        take: 5,
      });

      for (const trip of staleTrips) {
        notifications.push({
          id: `stale-${trip.id}`,
          type: "STALE_LEAD",
          title: `Stale Lead: ${trip.trip_display_id}`,
          message: `Inquiry for ${trip.guest.full_name} has not had activity in over 3 days.`,
          time: trip.updated_at.toISOString(),
          link: `/trips/${trip.id}`,
          severity: "warning",
        });
      }
    } catch (err: any) {
      console.warn("[Notifications API] DB offline, using mock dummy notifications:", err.message);
      const { MOCK_NOTIFICATIONS } = await import("@/lib/mock-data-store");
      return NextResponse.json({
        notifications: MOCK_NOTIFICATIONS,
        unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.is_read).length,
      });
    }

    return NextResponse.json({
      notifications,
      unreadCount: notifications.length,
    });
  },
  {
    allowedRoles: [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_HEAD",
      "SALES_PERSON",
      "OPERATIONS",
      "RESERVATIONS",
      "ACCOUNTANT",
      "DATA_OPERATOR",
    ],
  }
);
