import {
  mysqlTable,
  varchar,
  char,
  datetime,
  boolean,
  text,
  int,
  mysqlEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

const id = () => char("id", { length: 36 }).primaryKey();
const tenantId = () => char("tenant_id", { length: 36 }).notNull();
const timestamps = {
  createdAt: datetime("created_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  createdBy: char("created_by", { length: 36 }),
  updatedAt: datetime("updated_at", { mode: "string", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  updatedBy: char("updated_by", { length: 36 }),
  isDeleted: boolean("is_deleted").notNull().default(false),
};

export const societies = mysqlTable("societies", {
  id: id(),
  name: varchar("name", { length: 200 }).notNull(),
  address: varchar("address", { length: 500 }),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Kolkata"),
  ...timestamps,
});

export const buildings = mysqlTable(
  "buildings",
  {
    id: id(),
    tenantId: tenantId(),
    name: varchar("name", { length: 120 }).notNull(),
    ...timestamps,
  },
  (t) => [index("buildings_tenant_idx").on(t.tenantId)],
);

export const wings = mysqlTable(
  "wings",
  {
    id: id(),
    tenantId: tenantId(),
    buildingId: char("building_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    ...timestamps,
  },
  (t) => [index("wings_tenant_idx").on(t.tenantId)],
);

export const flats = mysqlTable(
  "flats",
  {
    id: id(),
    tenantId: tenantId(),
    wingId: char("wing_id", { length: 36 }).notNull(),
    number: varchar("number", { length: 32 }).notNull(),
    ...timestamps,
  },
  (t) => [
    index("flats_tenant_idx").on(t.tenantId),
    uniqueIndex("flats_tenant_number_uidx").on(t.tenantId, t.number),
  ],
);

export const users = mysqlTable(
  "users",
  {
    id: id(),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 200 }),
    name: varchar("name", { length: 120 }),
    username: varchar("username", { length: 64 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    googleSub: varchar("google_sub", { length: 128 }),
    pinHash: varchar("pin_hash", { length: 255 }),
    pinUpdatedAt: datetime("pin_updated_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_phone_uidx").on(t.phone),
    uniqueIndex("users_email_uidx").on(t.email),
    uniqueIndex("users_username_uidx").on(t.username),
  ],
);

export const userRoles = mysqlTable(
  "user_roles",
  {
    id: id(),
    tenantId: tenantId(),
    userId: char("user_id", { length: 36 }).notNull(),
    role: mysqlEnum("role", ["admin", "resident", "superadmin"]).notNull(),
    ...timestamps,
  },
  (t) => [
    index("user_roles_tenant_user_idx").on(t.tenantId, t.userId),
    uniqueIndex("user_roles_tenant_user_role_uidx").on(
      t.tenantId,
      t.userId,
      t.role,
    ),
  ],
);

export const residents = mysqlTable(
  "residents",
  {
    id: id(),
    tenantId: tenantId(),
    userId: char("user_id", { length: 36 }).notNull(),
    flatId: char("flat_id", { length: 36 }).notNull(),
    isOwner: boolean("is_owner").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("residents_tenant_idx").on(t.tenantId),
    uniqueIndex("residents_tenant_user_uidx").on(t.tenantId, t.userId),
  ],
);

export const otpChallenges = mysqlTable(
  "otp_challenges",
  {
    id: id(),
    phone: varchar("phone", { length: 20 }).notNull(),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }).notNull(),
    consumedAt: datetime("consumed_at", { mode: "string", fsp: 3 }),
    attempts: int("attempts").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("otp_phone_idx").on(t.phone)],
);

export const passwordResetChallenges = mysqlTable(
  "password_reset_challenges",
  {
    id: id(),
    email: varchar("email", { length: 200 }).notNull(),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }).notNull(),
    consumedAt: datetime("consumed_at", { mode: "string", fsp: 3 }),
    attempts: int("attempts").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("password_reset_email_idx").on(t.email)],
);

export const refreshTokens = mysqlTable(
  "refresh_tokens",
  {
    id: id(),
    userId: char("user_id", { length: 36 }).notNull(),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }).notNull(),
    revokedAt: datetime("revoked_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [index("refresh_user_idx").on(t.userId)],
);

export const complaints = mysqlTable(
  "complaints",
  {
    id: id(),
    tenantId: tenantId(),
    ticketNumber: varchar("ticket_number", { length: 32 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    type: mysqlEnum("type", [
      "electric",
      "plumbing",
      "housekeeping",
      "security",
      "lift",
      "other",
    ]).notNull(),
    typeOtherText: varchar("type_other_text", { length: 120 }),
    description: text("description").notNull(),
    status: mysqlEnum("status", [
      "open",
      "in_progress",
      "resolved",
      "closed",
    ])
      .notNull()
      .default("open"),
    flatId: char("flat_id", { length: 36 }).notNull(),
    raisedByUserId: char("raised_by_user_id", { length: 36 }).notNull(),
    ...timestamps,
  },
  (t) => [
    index("complaints_tenant_status_idx").on(t.tenantId, t.status),
    uniqueIndex("complaints_tenant_ticket_uidx").on(t.tenantId, t.ticketNumber),
  ],
);

export const complaintAttachments = mysqlTable(
  "complaint_attachments",
  {
    id: id(),
    tenantId: tenantId(),
    complaintId: char("complaint_id", { length: 36 }).notNull(),
    contentKind: mysqlEnum("content_kind", ["image", "video"]).notNull(),
    contentType: varchar("content_type", { length: 120 }).notNull(),
    blobPath: varchar("blob_path", { length: 500 }).notNull(),
    byteSize: int("byte_size").notNull(),
    durationSeconds: int("duration_seconds"),
    ...timestamps,
  },
  (t) => [index("attachments_complaint_idx").on(t.complaintId)],
);
