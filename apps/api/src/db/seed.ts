import { eq } from "drizzle-orm";
import { db } from "./client";
import {
  buildings,
  flats,
  residents,
  societies,
  userRoles,
  users,
  wings,
} from "./schema";

function id() {
  return crypto.randomUUID();
}

async function main() {
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const adminUserId = "22222222-2222-2222-2222-222222222222";
  const residentUserId = "33333333-3333-3333-3333-333333333333";
  const buildingId = "44444444-4444-4444-4444-444444444444";
  const wingId = "55555555-5555-5555-5555-555555555555";
  const flatId = "66666666-6666-6666-6666-666666666666";

  const existing = await db
    .select()
    .from(societies)
    .where(eq(societies.id, tenantId))
    .limit(1);
  if (existing.length) {
    console.log("Seed already applied");
    return;
  }

  await db.insert(societies).values({
    id: tenantId,
    name: "Keshav Heights",
    address: "Pilot Society",
    timezone: "Asia/Kolkata",
  });

  await db.insert(buildings).values({
    id: buildingId,
    tenantId,
    name: "Tower A",
  });

  await db.insert(wings).values({
    id: wingId,
    tenantId,
    buildingId,
    name: "A",
  });

  await db.insert(flats).values({
    id: flatId,
    tenantId,
    wingId,
    number: "101",
  });

  await db.insert(users).values([
    {
      id: adminUserId,
      phone: "9999999999",
      name: "Society Admin",
      email: "admin@keshav.local",
    },
    {
      id: residentUserId,
      phone: "8888888888",
      name: "Demo Resident",
      email: "resident@keshav.local",
    },
  ]);

  await db.insert(userRoles).values([
    {
      id: id(),
      tenantId,
      userId: adminUserId,
      role: "admin",
    },
    {
      id: id(),
      tenantId,
      userId: residentUserId,
      role: "resident",
    },
  ]);

  await db.insert(residents).values({
    id: id(),
    tenantId,
    userId: residentUserId,
    flatId,
    isOwner: true,
  });

  console.log("Seeded Keshav Heights");
  console.log("Admin phone: 9999999999");
  console.log("Resident phone: 8888888888");
  console.log("Dev OTP code: 123456 (when DEV_AUTH=true)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
