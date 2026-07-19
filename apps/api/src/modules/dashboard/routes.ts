import { Elysia } from "elysia";
import { and, count, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import type { DashboardStatsDto } from "@society-hub/types";
import { db } from "../../db/client";
import { bills, bookings, complaints, notices, notifications } from "../../db/schema";
import { authPlugin, isStaffRole, requireAuth } from "../../lib/auth-context";


export const dashboardRoutes = new Elysia({ prefix: "/v1/dashboard" })
  .use(authPlugin)
  .get("/stats", async ({ auth }) => {
    const claims = requireAuth(auth);
    const staff = isStaffRole(claims.role);

    const complaintWhere = staff
      ? and(eq(complaints.tenantId, claims.tenantId), eq(complaints.isDeleted, false))
      : and(
          eq(complaints.tenantId, claims.tenantId),
          eq(complaints.raisedByUserId, claims.sub),
          eq(complaints.isDeleted, false),
        );

    const [[openRow], [totalRow]] = await Promise.all([
      db
        .select({ total: count() })
        .from(complaints)
        .where(and(complaintWhere, inArray(complaints.status, ["open", "assigned", "in_progress"]))),
      db.select({ total: count() }).from(complaints).where(complaintWhere),
    ]);

    const billWhere = staff
      ? and(eq(bills.tenantId, claims.tenantId), eq(bills.isDeleted, false))
      : and(
          eq(bills.tenantId, claims.tenantId),
          claims.flatId ? eq(bills.flatId, claims.flatId) : eq(bills.flatId, "__none__"),
          eq(bills.isDeleted, false),
        );

    const outstandingRows = await db
      .select({ amountPaise: bills.amountPaise })
      .from(bills)
      .where(and(billWhere, inArray(bills.status, ["issued"])));
    const duesOutstandingPaise = outstandingRows.reduce((sum, b) => sum + b.amountPaise, 0);

    const [bookingRow] = await db
      .select({ total: count() })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, claims.tenantId),
          eq(bookings.isDeleted, false),
          ne(bookings.status, "cancelled"),
        ),
      );

    const [noticeRow] = await db
      .select({ total: count() })
      .from(notices)
      .where(
        and(
          eq(notices.tenantId, claims.tenantId),
          eq(notices.isDeleted, false),
          isNotNull(notices.publishedAt),
          isNull(notices.unpublishedAt),
        ),
      );

    const [unreadRow] = await db
      .select({ total: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, claims.tenantId),
          eq(notifications.userId, claims.sub),
          eq(notifications.isDeleted, false),
          isNull(notifications.readAt),
        ),
      );

    const stats: DashboardStatsDto = {
      openComplaints: Number(openRow?.total ?? 0),
      totalComplaints: Number(totalRow?.total ?? 0),
      duesOutstandingPaise,
      upcomingBookings: Number(bookingRow?.total ?? 0),
      publishedNotices: Number(noticeRow?.total ?? 0),
      unreadNotifications: Number(unreadRow?.total ?? 0),
    };
    return stats;
  });
