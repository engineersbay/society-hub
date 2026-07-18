import { Elysia } from "elysia";
import { and, eq } from "drizzle-orm";
import { onboardResidentSchema } from "@society-hub/validation";
import { db } from "../../db/client";
import { flats, residents, userRoles, users, wings } from "../../db/schema";
import { AppError } from "../../lib/errors";
import {
  authPlugin,
  buildUserDto,
  requireAuth,
  requireRole,
} from "../../lib/auth-context";

export const adminRoutes = new Elysia({ prefix: "/v1/admin" })
  .use(authPlugin)
  .get("/flats", async ({ auth }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin"]);
    const rows = await db
      .select({
        id: flats.id,
        number: flats.number,
        wingName: wings.name,
      })
      .from(flats)
      .leftJoin(wings, eq(wings.id, flats.wingId))
      .where(
        and(eq(flats.tenantId, claims.tenantId), eq(flats.isDeleted, false)),
      );
    return rows.map((r) => ({
      id: r.id,
      number: r.number,
      wingName: r.wingName,
    }));
  })
  .post("/residents", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin"]);
    const parsed = onboardResidentSchema.parse(body);

    const [flat] = await db
      .select()
      .from(flats)
      .where(
        and(
          eq(flats.id, parsed.flatId),
          eq(flats.tenantId, claims.tenantId),
          eq(flats.isDeleted, false),
        ),
      )
      .limit(1);
    if (!flat) throw new AppError(404, "flat_not_found", "Flat not found");

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.phone, parsed.phone))
      .limit(1);

    let userId = existing?.id;
    if (!userId) {
      userId = crypto.randomUUID();
      await db.insert(users).values({
        id: userId,
        phone: parsed.phone,
        name: parsed.name,
        email: parsed.email ?? null,
      });
    } else {
      await db
        .update(users)
        .set({ name: parsed.name, email: parsed.email ?? existing?.email })
        .where(eq(users.id, userId));
    }

    const [role] = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.tenantId, claims.tenantId),
          eq(userRoles.role, "resident"),
        ),
      )
      .limit(1);
    if (!role) {
      await db.insert(userRoles).values({
        id: crypto.randomUUID(),
        tenantId: claims.tenantId,
        userId,
        role: "resident",
      });
    }

    const [res] = await db
      .select()
      .from(residents)
      .where(
        and(
          eq(residents.userId, userId),
          eq(residents.tenantId, claims.tenantId),
        ),
      )
      .limit(1);
    if (!res) {
      await db.insert(residents).values({
        id: crypto.randomUUID(),
        tenantId: claims.tenantId,
        userId,
        flatId: parsed.flatId,
        isOwner: true,
      });
    } else {
      await db
        .update(residents)
        .set({ flatId: parsed.flatId, isDeleted: false })
        .where(eq(residents.id, res.id));
    }

    const user = await buildUserDto(userId, claims.tenantId, "resident");
    return { user };
  });
