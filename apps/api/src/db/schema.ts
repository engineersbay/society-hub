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

export const societies = mysqlTable(
  "societies",
  {
    id: id(),
    name: varchar("name", { length: 200 }).notNull(),
    /** Unique subdomain label: {slug}.{SOCIETYHUB_ROOT_DOMAIN} */
    slug: varchar("slug", { length: 80 }),
    /** Optional custom host for the Client App (normalized, no scheme). */
    customDomain: varchar("custom_domain", { length: 255 }),
    address: varchar("address", { length: 500 }),
    city: varchar("city", { length: 120 }),
    pincode: varchar("pincode", { length: 12 }),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Kolkata"),
    slaDays: int("sla_days").notNull().default(3),
    billingDefaults: text("billing_defaults"),
    status: mysqlEnum("status", ["active", "suspended"]).notNull().default("active"),
    featureFlagsJson: text("feature_flags_json"),
    planId: char("plan_id", { length: 36 }),
    /** Client App white-label: logos + brand colors (Fassport Theme / Media). */
    brandLogoBlobPath: varchar("brand_logo_blob_path", { length: 500 }),
    brandLogoContentType: varchar("brand_logo_content_type", { length: 120 }),
    brandLogoDarkBlobPath: varchar("brand_logo_dark_blob_path", { length: 500 }),
    brandIconBlobPath: varchar("brand_icon_blob_path", { length: 500 }),
    brandColor: varchar("brand_color", { length: 32 }),
    brandSecondaryColor: varchar("brand_secondary_color", { length: 32 }),
    brandTertiaryColor: varchar("brand_tertiary_color", { length: 32 }),
    brandingEnabled: boolean("branding_enabled").notNull().default(false),
    /** Offline UPI / bank details residents use to pay (Razorpay is future). */
    upiId: varchar("upi_id", { length: 80 }),
    accountName: varchar("account_name", { length: 120 }),
    accountNumber: varchar("account_number", { length: 40 }),
    ifsc: varchar("ifsc", { length: 20 }),
    qrBlobPath: varchar("qr_blob_path", { length: 500 }),
    qrContentType: varchar("qr_content_type", { length: 120 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("societies_slug_uidx").on(t.slug),
    uniqueIndex("societies_custom_domain_uidx").on(t.customDomain),
  ],
);

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
    /** Floor within the wing (null = unset). */
    floor: int("floor"),
    /** Primary parking slot label linked to this flat (optional). */
    parkingSlot: varchar("parking_slot", { length: 32 }),
    /** Whether this flat has taken a PNG gas connection. */
    pngGasConnection: boolean("png_gas_connection").notNull().default(false),
    adultCount: int("adult_count").notNull().default(0),
    childCount: int("child_count").notNull().default(0),
    seniorCitizenCount: int("senior_citizen_count").notNull().default(0),
    /** Extensible JSON bag for society-specific flat attributes. */
    detailsJson: text("details_json"),
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
    role: mysqlEnum("role", [
      "superadmin",
      "chairperson",
      "admin",
      "secretary",
      "treasurer",
      "cashier",
      "committee",
      "resident",
      "tenant",
    ]).notNull(),
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

/**
 * A person's membership of one society, occupying one flat, over one period.
 *
 * This table *is* the membership + occupancy record — a move-out closes the
 * row (`status = 'moved_out'`, `move_out_date` set, `active_key = NULL`) and a
 * move-in inserts a new one, so occupancy history is simply the row set and is
 * never destroyed.
 *
 * `active_key` is the MySQL-compatible partial-unique trick: it holds `'Y'`
 * while the membership still occupies the flat and `NULL` once it does not.
 * MySQL allows repeated NULLs in a unique index, so historical rows are
 * unconstrained while at most one *active* membership can exist per person per
 * flat per society.
 */
export const residents = mysqlTable(
  "residents",
  {
    id: id(),
    tenantId: tenantId(),
    userId: char("user_id", { length: 36 }).notNull(),
    flatId: char("flat_id", { length: 36 }).notNull(),
    /** Derived mirror of `residentType === 'owner'`; kept for existing callers. */
    isOwner: boolean("is_owner").notNull().default(false),
    residentType: mysqlEnum("resident_type", ["owner", "tenant", "family"])
      .notNull()
      .default("owner"),
    /** Primary owner / primary tenant of the flat (co-owners are `false`). */
    isPrimary: boolean("is_primary").notNull().default(true),
    status: mysqlEnum("status", [
      "invited",
      "pending_verification",
      "active",
      "suspended",
      "moved_out",
      "rejected",
    ])
      .notNull()
      .default("active"),
    verificationStatus: mysqlEnum("verification_status", [
      "pending",
      "under_review",
      "approved",
      "rejected",
    ])
      .notNull()
      .default("pending"),
    verifiedBy: char("verified_by", { length: 36 }),
    verifiedAt: datetime("verified_at", { mode: "string", fsp: 3 }),
    rejectionReason: varchar("rejection_reason", { length: 500 }),
    moveInDate: datetime("move_in_date", { mode: "string", fsp: 3 }),
    moveOutDate: datetime("move_out_date", { mode: "string", fsp: 3 }),
    moveOutReason: varchar("move_out_reason", { length: 200 }),
    remarks: varchar("remarks", { length: 500 }),
    /** `'Y'` while occupying, NULL otherwise — see the note above. */
    activeKey: char("active_key", { length: 1 }).default("Y"),
    ...timestamps,
  },
  (t) => [
    index("residents_tenant_idx").on(t.tenantId),
    index("residents_tenant_flat_active_idx").on(t.tenantId, t.flatId, t.activeKey),
    index("residents_tenant_status_idx").on(t.tenantId, t.status),
    index("residents_tenant_verification_idx").on(t.tenantId, t.verificationStatus),
    index("residents_tenant_user_idx").on(t.tenantId, t.userId),
    uniqueIndex("residents_tenant_user_flat_active_uidx").on(
      t.tenantId,
      t.userId,
      t.flatId,
      t.activeKey,
    ),
  ],
);

/**
 * Household members of a membership. A family member may have no SocietyHub
 * login at all, so this cannot be modelled by `residents` (whose `user_id` is
 * NOT NULL). `linked_user_id` connects the ones who do have an account.
 */
export const residentFamilyMembers = mysqlTable(
  "resident_family_members",
  {
    id: id(),
    tenantId: tenantId(),
    residentId: char("resident_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    relationship: mysqlEnum("relationship", [
      "spouse",
      "child",
      "parent",
      "sibling",
      "other",
    ])
      .notNull()
      .default("other"),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 200 }),
    /** Set when this household member also has a SocietyHub account. */
    linkedUserId: char("linked_user_id", { length: 36 }),
    ...timestamps,
  },
  (t) => [
    index("resident_family_tenant_idx").on(t.tenantId),
    index("resident_family_resident_idx").on(t.tenantId, t.residentId),
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
      "assigned",
      "in_progress",
      "resolved",
      "closed",
    ])
      .notNull()
      .default("open"),
    flatId: char("flat_id", { length: 36 }).notNull(),
    raisedByUserId: char("raised_by_user_id", { length: 36 }).notNull(),
    assignedToUserId: char("assigned_to_user_id", { length: 36 }),
    slaDueAt: datetime("sla_due_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [
    index("complaints_tenant_status_idx").on(t.tenantId, t.status),
    uniqueIndex("complaints_tenant_ticket_uidx").on(t.tenantId, t.ticketNumber),
  ],
);

export const complaintComments = mysqlTable(
  "complaint_comments",
  {
    id: id(),
    tenantId: tenantId(),
    complaintId: char("complaint_id", { length: 36 }).notNull(),
    userId: char("user_id", { length: 36 }).notNull(),
    body: text("body").notNull(),
    kind: mysqlEnum("kind", ["comment", "question"]).notNull().default("comment"),
    ...timestamps,
  },
  (t) => [index("complaint_comments_complaint_idx").on(t.complaintId)],
);

export const complaintStatusEvents = mysqlTable(
  "complaint_status_events",
  {
    id: id(),
    tenantId: tenantId(),
    complaintId: char("complaint_id", { length: 36 }).notNull(),
    fromStatus: varchar("from_status", { length: 32 }),
    toStatus: varchar("to_status", { length: 32 }).notNull(),
    actorUserId: char("actor_user_id", { length: 36 }).notNull(),
    note: text("note"),
    ...timestamps,
  },
  (t) => [index("complaint_status_events_complaint_idx").on(t.complaintId)],
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

export const invitations = mysqlTable(
  "invitations",
  {
    id: id(),
    tenantId: tenantId(),
    email: varchar("email", { length: 200 }),
    phone: varchar("phone", { length: 20 }),
    role: mysqlEnum("role", [
      "superadmin",
      "chairperson",
      "admin",
      "secretary",
      "treasurer",
      "cashier",
      "committee",
      "resident",
      "tenant",
    ]).notNull(),
    token: varchar("token", { length: 128 }).notNull(),
    status: mysqlEnum("status", ["pending", "accepted", "revoked", "expired"])
      .notNull()
      .default("pending"),
    invitedBy: char("invited_by", { length: 36 }).notNull(),
    /** Display name to pre-fill on acceptance. */
    name: varchar("name", { length: 120 }),
    /** Flat the invitee will be onboarded into (optional for staff invites). */
    flatId: char("flat_id", { length: 36 }),
    residentType: mysqlEnum("resident_type", ["owner", "tenant", "family"]),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }),
    acceptedAt: datetime("accepted_at", { mode: "string", fsp: 3 }),
    acceptedByUserId: char("accepted_by_user_id", { length: 36 }),
    revokedAt: datetime("revoked_at", { mode: "string", fsp: 3 }),
    lastSentAt: datetime("last_sent_at", { mode: "string", fsp: 3 }),
    resendCount: int("resend_count").notNull().default(0),
    /**
     * `lower(email|phone|role)` while the invitation is pending, NULL otherwise.
     * The unique index below therefore blocks a second *active* invitation for
     * the same recipient while leaving revoked/accepted history unconstrained.
     */
    activeKey: varchar("active_key", { length: 240 }),
    ...timestamps,
  },
  (t) => [
    index("invitations_tenant_idx").on(t.tenantId),
    index("invitations_tenant_status_idx").on(t.tenantId, t.status),
    uniqueIndex("invitations_token_uidx").on(t.token),
    uniqueIndex("invitations_tenant_active_uidx").on(t.tenantId, t.activeKey),
  ],
);

export const residentProfiles = mysqlTable(
  "resident_profiles",
  {
    id: id(),
    tenantId: tenantId(),
    userId: char("user_id", { length: 36 }).notNull(),
    /** @deprecated Free-text legacy field; prefer the structured columns below. */
    emergencyContact: varchar("emergency_contact", { length: 40 }),
    emergencyContactName: varchar("emergency_contact_name", { length: 120 }),
    emergencyContactRelation: varchar("emergency_contact_relation", { length: 40 }),
    emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
    vehicleNumber: varchar("vehicle_number", { length: 32 }),
    /**
     * Channel opt-ins as JSON, e.g. `{"inApp":true,"push":true,"email":false}`.
     * Only in-app delivery is implemented; the shape stays open so push/email/
     * WhatsApp/SMS can be added without another migration.
     */
    communicationPrefsJson: text("communication_prefs_json"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("resident_profiles_tenant_user_uidx").on(t.tenantId, t.userId),
  ],
);

export const residentVehicles = mysqlTable(
  "resident_vehicles",
  {
    id: id(),
    tenantId: tenantId(),
    userId: char("user_id", { length: 36 }).notNull(),
    kind: mysqlEnum("kind", ["two_wheeler", "four_wheeler"]).notNull(),
    registrationNumber: varchar("registration_number", { length: 32 }),
    parkingPurchased: boolean("parking_purchased").notNull().default(false),
    parkingSlot: varchar("parking_slot", { length: 32 }),
    sortOrder: int("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("resident_vehicles_tenant_user_idx").on(t.tenantId, t.userId),
  ],
);

export const verificationDocuments = mysqlTable(
  "verification_documents",
  {
    id: id(),
    tenantId: tenantId(),
    /** FK to `residents.id` — the membership the document belongs to. */
    residentId: char("resident_id", { length: 36 }).notNull(),
    docType: mysqlEnum("doc_type", [
      "identity",
      "address_proof",
      "tenant_agreement",
      "police_verification",
      "other",
    ])
      .notNull()
      .default("other"),
    /** Masked/partial reference only — never a full sensitive number. */
    documentNumber: varchar("document_number", { length: 64 }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    blobPath: varchar("blob_path", { length: 500 }).notNull(),
    contentType: varchar("content_type", { length: 120 }).notNull(),
    byteSize: int("byte_size"),
    status: mysqlEnum("status", [
      "pending",
      "under_review",
      "approved",
      "rejected",
    ])
      .notNull()
      .default("pending"),
    uploadedByUserId: char("uploaded_by_user_id", { length: 36 }),
    verifiedBy: char("verified_by", { length: 36 }),
    verifiedAt: datetime("verified_at", { mode: "string", fsp: 3 }),
    rejectionReason: varchar("rejection_reason", { length: 500 }),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [
    index("verification_documents_resident_idx").on(t.residentId),
    index("verification_documents_tenant_resident_idx").on(t.tenantId, t.residentId),
    index("verification_documents_tenant_status_idx").on(t.tenantId, t.status),
  ],
);

export const bills = mysqlTable(
  "bills",
  {
    id: id(),
    tenantId: tenantId(),
    flatId: char("flat_id", { length: 36 }).notNull(),
    periodYm: varchar("period_ym", { length: 7 }).notNull(),
    amountPaise: int("amount_paise").notNull(),
    status: mysqlEnum("status", [
      "draft",
      "issued",
      "paid",
      "void",
      "corrected",
    ])
      .notNull()
      .default("draft"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("bills_tenant_flat_idx").on(t.tenantId, t.flatId),
    index("bills_tenant_period_idx").on(t.tenantId, t.periodYm),
  ],
);

export const billLineItems = mysqlTable(
  "bill_line_items",
  {
    id: id(),
    tenantId: tenantId(),
    billId: char("bill_id", { length: 36 }).notNull(),
    label: varchar("label", { length: 200 }).notNull(),
    amountPaise: int("amount_paise").notNull(),
    ...timestamps,
  },
  (t) => [index("bill_line_items_bill_idx").on(t.billId)],
);

export const payments = mysqlTable(
  "payments",
  {
    id: id(),
    tenantId: tenantId(),
    billId: char("bill_id", { length: 36 }),
    flatId: char("flat_id", { length: 36 }).notNull(),
    amountPaise: int("amount_paise").notNull(),
    method: mysqlEnum("method", ["razorpay", "cash", "cheque", "neft", "upi"]).notNull(),
    status: mysqlEnum("status", ["pending", "success", "failed"])
      .notNull()
      .default("pending"),
    razorpayOrderId: varchar("razorpay_order_id", { length: 120 }),
    razorpayPaymentId: varchar("razorpay_payment_id", { length: 120 }),
    receiptNumber: varchar("receipt_number", { length: 64 }),
    proofBlobPath: varchar("proof_blob_path", { length: 500 }),
    proofContentType: varchar("proof_content_type", { length: 120 }),
    reviewNote: varchar("review_note", { length: 500 }),
    ...timestamps,
  },
  (t) => [
    index("payments_tenant_flat_idx").on(t.tenantId, t.flatId),
    index("payments_tenant_bill_idx").on(t.tenantId, t.billId),
  ],
);

export const notices = mysqlTable(
  "notices",
  {
    id: id(),
    tenantId: tenantId(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    audience: mysqlEnum("audience", ["all", "wing", "flat"])
      .notNull()
      .default("all"),
    wingId: char("wing_id", { length: 36 }),
    flatId: char("flat_id", { length: 36 }),
    publishedAt: datetime("published_at", { mode: "string", fsp: 3 }),
    unpublishedAt: datetime("unpublished_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [index("notices_tenant_idx").on(t.tenantId)],
);

export const noticeAttachments = mysqlTable(
  "notice_attachments",
  {
    id: id(),
    tenantId: tenantId(),
    noticeId: char("notice_id", { length: 36 }).notNull(),
    contentKind: mysqlEnum("content_kind", ["image", "video"]).notNull(),
    contentType: varchar("content_type", { length: 120 }).notNull(),
    blobPath: varchar("blob_path", { length: 500 }).notNull(),
    byteSize: int("byte_size").notNull(),
    ...timestamps,
  },
  (t) => [index("notice_attachments_notice_idx").on(t.noticeId)],
);

export const noticeReads = mysqlTable(
  "notice_reads",
  {
    id: id(),
    tenantId: tenantId(),
    noticeId: char("notice_id", { length: 36 }).notNull(),
    userId: char("user_id", { length: 36 }).notNull(),
    readAt: datetime("read_at", { mode: "string", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("notice_reads_notice_user_uidx").on(t.noticeId, t.userId),
  ],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: id(),
    tenantId: tenantId(),
    userId: char("user_id", { length: 36 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    kind: varchar("kind", { length: 40 }).notNull().default("general"),
    readAt: datetime("read_at", { mode: "string", fsp: 3 }),
    linkPath: varchar("link_path", { length: 300 }),
    ...timestamps,
  },
  (t) => [index("notifications_tenant_user_idx").on(t.tenantId, t.userId)],
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: id(),
    tenantId: tenantId(),
    actorUserId: char("actor_user_id", { length: 36 }).notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    /** Human-readable summary (Fassport-style Event.message). */
    message: varchar("message", { length: 500 }),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: char("entity_id", { length: 36 }).notNull(),
    meta: text("meta"),
    ...timestamps,
  },
  (t) => [
    index("audit_logs_tenant_idx").on(t.tenantId),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_actor_idx").on(t.actorUserId),
  ],
);

export const visitors = mysqlTable(
  "visitors",
  {
    id: id(),
    tenantId: tenantId(),
    flatId: char("flat_id", { length: 36 }).notNull(),
    visitorName: varchar("visitor_name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    purpose: varchar("purpose", { length: 200 }),
    expectedAt: datetime("expected_at", { mode: "string", fsp: 3 }),
    checkedInAt: datetime("checked_in_at", { mode: "string", fsp: 3 }),
    checkedOutAt: datetime("checked_out_at", { mode: "string", fsp: 3 }),
    passToken: char("pass_token", { length: 36 }),
    otpHash: varchar("otp_hash", { length: 255 }),
    otpExpiresAt: datetime("otp_expires_at", { mode: "string", fsp: 3 }),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }),
    passIssuedAt: datetime("pass_issued_at", { mode: "string", fsp: 3 }),
    passStatus: mysqlEnum("pass_status", [
      "none",
      "issued",
      "used",
      "expired",
      "revoked",
    ])
      .notNull()
      .default("none"),
    verifiedByUserId: char("verified_by_user_id", { length: 36 }),
    verifiedAt: datetime("verified_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [
    index("visitors_tenant_flat_idx").on(t.tenantId, t.flatId),
    uniqueIndex("visitors_pass_token_uidx").on(t.passToken),
  ],
);

export const parkingSlots = mysqlTable(
  "parking_slots",
  {
    id: id(),
    tenantId: tenantId(),
    flatId: char("flat_id", { length: 36 }),
    slotNumber: varchar("slot_number", { length: 32 }).notNull(),
    vehicleNumber: varchar("vehicle_number", { length: 32 }),
    type: varchar("type", { length: 32 }).notNull().default("car"),
    kind: mysqlEnum("kind", ["puzzle", "open"]).notNull().default("open"),
    wing: varchar("wing", { length: 32 }),
    floor: int("floor"),
    ...timestamps,
  },
  (t) => [index("parking_slots_tenant_idx").on(t.tenantId)],
);

export const bookings = mysqlTable(
  "bookings",
  {
    id: id(),
    tenantId: tenantId(),
    facilityName: varchar("facility_name", { length: 120 }).notNull(),
    flatId: char("flat_id", { length: 36 }).notNull(),
    bookedByUserId: char("booked_by_user_id", { length: 36 }).notNull(),
    startAt: datetime("start_at", { mode: "string", fsp: 3 }).notNull(),
    endAt: datetime("end_at", { mode: "string", fsp: 3 }).notNull(),
    status: mysqlEnum("status", ["pending", "confirmed", "cancelled"])
      .notNull()
      .default("pending"),
    ...timestamps,
  },
  (t) => [index("bookings_tenant_idx").on(t.tenantId)],
);

export const assets = mysqlTable(
  "assets",
  {
    id: id(),
    tenantId: tenantId(),
    name: varchar("name", { length: 200 }).notNull(),
    category: varchar("category", { length: 80 }),
    location: varchar("location", { length: 200 }),
    purchaseDate: datetime("purchase_date", { mode: "string", fsp: 3 }),
    nextServiceAt: datetime("next_service_at", { mode: "string", fsp: 3 }),
    value: int("value_paise"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("assets_tenant_idx").on(t.tenantId)],
);

export const vendors = mysqlTable(
  "vendors",
  {
    id: id(),
    tenantId: tenantId(),
    name: varchar("name", { length: 200 }).notNull(),
    category: varchar("category", { length: 80 }),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 200 }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("vendors_tenant_idx").on(t.tenantId)],
);

export const events = mysqlTable(
  "events",
  {
    id: id(),
    tenantId: tenantId(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    startAt: datetime("start_at", { mode: "string", fsp: 3 }),
    endAt: datetime("end_at", { mode: "string", fsp: 3 }),
    location: varchar("location", { length: 200 }),
    capacity: int("capacity"),
    ...timestamps,
  },
  (t) => [index("events_tenant_idx").on(t.tenantId)],
);

export const eventRsvps = mysqlTable(
  "event_rsvps",
  {
    id: id(),
    tenantId: tenantId(),
    eventId: char("event_id", { length: 36 }).notNull(),
    userId: char("user_id", { length: 36 }).notNull(),
    ...timestamps,
  },
  (t) => [
    index("event_rsvps_tenant_idx").on(t.tenantId),
    uniqueIndex("event_rsvps_event_user_uidx").on(t.eventId, t.userId),
  ],
);

/** SocietyHub SaaS plans (Manage commercial). */
export const platformPlans = mysqlTable("platform_plans", {
  id: id(),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  monthlyFeePaise: int("monthly_fee_paise").notNull().default(0),
  modulesJson: text("modules_json"),
  flatHint: int("flat_hint"),
  ...timestamps,
});

export const platformSubscriptions = mysqlTable(
  "platform_subscriptions",
  {
    id: id(),
    tenantId: tenantId(),
    planId: char("plan_id", { length: 36 }).notNull(),
    cycle: mysqlEnum("cycle", ["monthly", "yearly"]).notNull().default("monthly"),
    status: mysqlEnum("status", ["active", "cancelled", "expired"])
      .notNull()
      .default("active"),
    startsAt: datetime("starts_at", { mode: "string", fsp: 3 }).notNull(),
    endsAt: datetime("ends_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [index("platform_subscriptions_tenant_idx").on(t.tenantId)],
);

export const platformDiscounts = mysqlTable(
  "platform_discounts",
  {
    id: id(),
    tenantId: char("tenant_id", { length: 36 }),
    subscriptionId: char("subscription_id", { length: 36 }),
    code: varchar("code", { length: 40 }),
    percentOff: int("percent_off"),
    flatOffPaise: int("flat_off_paise"),
    startsAt: datetime("starts_at", { mode: "string", fsp: 3 }),
    endsAt: datetime("ends_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [index("platform_discounts_tenant_idx").on(t.tenantId)],
);

export const platformBills = mysqlTable(
  "platform_bills",
  {
    id: id(),
    tenantId: tenantId(),
    subscriptionId: char("subscription_id", { length: 36 }),
    periodYm: varchar("period_ym", { length: 7 }).notNull(),
    amountPaise: int("amount_paise").notNull(),
    status: mysqlEnum("status", ["issued", "paid", "void"]).notNull().default("issued"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("platform_bills_tenant_idx").on(t.tenantId)],
);

export const platformPayments = mysqlTable(
  "platform_payments",
  {
    id: id(),
    tenantId: tenantId(),
    billId: char("bill_id", { length: 36 }).notNull(),
    amountPaise: int("amount_paise").notNull(),
    method: varchar("method", { length: 40 }).notNull().default("offline"),
    status: mysqlEnum("status", ["success", "failed"]).notNull().default("success"),
    receiptNumber: varchar("receipt_number", { length: 64 }),
    ...timestamps,
  },
  (t) => [index("platform_payments_tenant_idx").on(t.tenantId)],
);

export const platformAnnouncements = mysqlTable("platform_announcements", {
  id: id(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  audience: mysqlEnum("audience", ["all", "tenants"]).notNull().default("all"),
  tenantIdsJson: text("tenant_ids_json"),
  publishedAt: datetime("published_at", { mode: "string", fsp: 3 }),
  ...timestamps,
});

export const supportTickets = mysqlTable(
  "support_tickets",
  {
    id: id(),
    tenantId: tenantId(),
    openedByUserId: char("opened_by_user_id", { length: 36 }).notNull(),
    subject: varchar("subject", { length: 200 }).notNull(),
    body: text("body").notNull(),
    status: mysqlEnum("status", ["open", "closed"]).notNull().default("open"),
    reply: text("reply"),
    closedAt: datetime("closed_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [index("support_tickets_tenant_idx").on(t.tenantId)],
);

const platformPayStatus = [
  "initiated",
  "order_pending",
  "order_created",
  "checkout_started",
  "payment_pending",
  "authorized",
  "captured",
  "failed",
  "cancelled",
  "expired",
  "refund_pending",
  "partially_refunded",
  "refunded",
  "reconciliation_required",
] as const;

/** Platform subscription fee payments (Manage), separate from resident flat payments. */
export const platformPaymentTransactions = mysqlTable(
  "platform_payment_transactions",
  {
    id: id(),
    tenantId: tenantId(),
    billId: char("bill_id", { length: 36 }).notNull(),
    paymentReference: varchar("payment_reference", { length: 64 }).notNull(),
    correlationId: varchar("correlation_id", { length: 64 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 200 }).notNull(),
    purpose: varchar("purpose", { length: 64 }).notNull().default("platform_subscription"),
    onboardingId: char("onboarding_id", { length: 36 }),
    currency: varchar("currency", { length: 8 }).notNull().default("INR"),
    amountPaise: int("amount_paise").notNull(),
    discountCode: varchar("discount_code", { length: 40 }),
    status: mysqlEnum("status", [...platformPayStatus]).notNull().default("initiated"),
    provider: varchar("provider", { length: 32 }).notNull().default("razorpay"),
    providerOrderId: varchar("provider_order_id", { length: 120 }),
    providerPaymentId: varchar("provider_payment_id", { length: 120 }),
    failureCode: varchar("failure_code", { length: 80 }),
    failureReason: varchar("failure_reason", { length: 500 }),
    method: varchar("method", { length: 40 }),
    completedAt: datetime("completed_at", { mode: "string", fsp: 3 }),
    failedAt: datetime("failed_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [
    index("platform_pay_txn_tenant_idx").on(t.tenantId),
    uniqueIndex("platform_pay_txn_ref_uidx").on(t.paymentReference),
    uniqueIndex("platform_pay_txn_idem_uidx").on(t.idempotencyKey),
    uniqueIndex("platform_pay_txn_provider_order_uidx").on(t.providerOrderId),
  ],
);

export const platformPaymentWebhookEvents = mysqlTable(
  "platform_payment_webhook_events",
  {
    id: id(),
    provider: varchar("provider", { length: 32 }).notNull().default("razorpay"),
    providerEventId: varchar("provider_event_id", { length: 120 }).notNull(),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    paymentTransactionId: char("payment_transaction_id", { length: 36 }),
    providerOrderId: varchar("provider_order_id", { length: 120 }),
    providerPaymentId: varchar("provider_payment_id", { length: 120 }),
    correlationId: varchar("correlation_id", { length: 64 }),
    signatureValid: boolean("signature_valid").notNull().default(false),
    processingStatus: mysqlEnum("processing_status", [
      "received",
      "processed",
      "already_processed",
      "failed",
      "ignored",
    ])
      .notNull()
      .default("received"),
    payloadHash: varchar("payload_hash", { length: 128 }),
    retryCount: int("retry_count").notNull().default(0),
    errorCode: varchar("error_code", { length: 80 }),
    errorMessage: varchar("error_message", { length: 500 }),
    receivedAt: datetime("received_at", { mode: "string", fsp: 3 }).notNull(),
    processedAt: datetime("processed_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [uniqueIndex("platform_pay_wh_event_uidx").on(t.providerEventId)],
);

export const platformPaymentRefunds = mysqlTable(
  "platform_payment_refunds",
  {
    id: id(),
    paymentTransactionId: char("payment_transaction_id", { length: 36 }).notNull(),
    providerRefundId: varchar("provider_refund_id", { length: 120 }),
    amountPaise: int("amount_paise").notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("INR"),
    reason: varchar("reason", { length: 500 }),
    status: mysqlEnum("status", ["requested", "processing", "processed", "failed"])
      .notNull()
      .default("requested"),
    correlationId: varchar("correlation_id", { length: 64 }),
    idempotencyKey: varchar("idempotency_key", { length: 200 }).notNull(),
    failureCode: varchar("failure_code", { length: 80 }),
    failureReason: varchar("failure_reason", { length: 500 }),
    requestedAt: datetime("requested_at", { mode: "string", fsp: 3 }).notNull(),
    processedAt: datetime("processed_at", { mode: "string", fsp: 3 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("platform_pay_refund_idem_uidx").on(t.idempotencyKey),
    uniqueIndex("platform_pay_refund_provider_uidx").on(t.providerRefundId),
  ],
);

export const platformPaymentApiLogs = mysqlTable("platform_payment_api_logs", {
  id: id(),
  paymentTransactionId: char("payment_transaction_id", { length: 36 }),
  correlationId: varchar("correlation_id", { length: 64 }),
  provider: varchar("provider", { length: 32 }).notNull().default("razorpay"),
  operation: varchar("operation", { length: 80 }).notNull(),
  httpMethod: varchar("http_method", { length: 12 }),
  endpoint: varchar("endpoint", { length: 255 }),
  durationMs: int("duration_ms"),
  httpStatus: int("http_status"),
  attemptNumber: int("attempt_number").notNull().default(1),
  success: boolean("success").notNull().default(false),
  errorCode: varchar("error_code", { length: 80 }),
  errorMessage: varchar("error_message", { length: 500 }),
  requestPayloadHash: varchar("request_payload_hash", { length: 128 }),
  responsePayloadHash: varchar("response_payload_hash", { length: 128 }),
  ...timestamps,
});

const societyOnboardStatus = [
  "started",
  "payment_pending",
  "paid",
  "provisioned",
  "failed",
] as const;

/** Self-serve society signup. Society row is created only after payment is captured or marked offline. */
export const societyOnboardings = mysqlTable(
  "society_onboardings",
  {
    id: id(),
    tenantId: tenantId(),
    planId: char("plan_id", { length: 36 }).notNull(),
    billId: char("bill_id", { length: 36 }).notNull(),
    resumeTokenHash: varchar("resume_token_hash", { length: 64 }).notNull(),
    status: mysqlEnum("status", [...societyOnboardStatus]).notNull().default("started"),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    customDomain: varchar("custom_domain", { length: 255 }),
    address: varchar("address", { length: 500 }),
    city: varchar("city", { length: 120 }),
    pincode: varchar("pincode", { length: 12 }),
    chairpersonName: varchar("chairperson_name", { length: 120 }),
    chairpersonEmail: varchar("chairperson_email", { length: 200 }).notNull(),
    chairpersonPhone: varchar("chairperson_phone", { length: 20 }).notNull(),
    chairpersonPasswordHash: varchar("chairperson_password_hash", { length: 255 }).notNull(),
    originalAmountPaise: int("original_amount_paise").notNull(),
    dueAmountPaise: int("due_amount_paise").notNull(),
    discountCode: varchar("discount_code", { length: 40 }),
    paymentTransactionId: char("payment_transaction_id", { length: 36 }),
    provisionedAt: datetime("provisioned_at", { mode: "string", fsp: 3 }),
    lastError: varchar("last_error", { length: 500 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("society_onboard_resume_uidx").on(t.resumeTokenHash),
    index("society_onboard_tenant_idx").on(t.tenantId),
  ],
);

/** Outbound WhatsApp ledger. Provider is a snapshot, not a live vendor call. */
export const communicationTransactions = mysqlTable(
  "communication_transactions",
  {
    id: id(),
    tenantId: tenantId(),
    communicationReference: varchar("communication_reference", { length: 40 }).notNull(),
    correlationId: varchar("correlation_id", { length: 64 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 200 }).notNull(),
    userId: char("user_id", { length: 36 }),
    actorUserId: char("actor_user_id", { length: 36 }),
    channel: varchar("channel", { length: 20 }).notNull().default("whatsapp"),
    provider: varchar("provider", { length: 20 }).notNull().default("stub"),
    templateKey: varchar("template_key", { length: 80 }).notNull(),
    templateVersion: varchar("template_version", { length: 20 }).notNull(),
    language: varchar("language", { length: 8 }).notNull().default("en"),
    recipientE164: varchar("recipient_e164", { length: 20 }).notNull(),
    recipientLast4: varchar("recipient_last4", { length: 4 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 128 }),
    businessEntityType: varchar("business_entity_type", { length: 40 }).notNull(),
    businessEntityId: varchar("business_entity_id", { length: 64 }).notNull(),
    businessEventType: varchar("business_event_type", { length: 80 }).notNull(),
    preferenceMode: varchar("preference_mode", { length: 20 }).notNull(),
    requestedAt: datetime("requested_at", { mode: "string", fsp: 3 }).notNull(),
    sentAt: datetime("sent_at", { mode: "string", fsp: 3 }),
    deliveredAt: datetime("delivered_at", { mode: "string", fsp: 3 }),
    readAt: datetime("read_at", { mode: "string", fsp: 3 }),
    failedAt: datetime("failed_at", { mode: "string", fsp: 3 }),
    nextAttemptAt: datetime("next_attempt_at", { mode: "string", fsp: 3 }),
    retryCount: int("retry_count").notNull().default(0),
    errorCategory: varchar("error_category", { length: 40 }),
    errorCode: varchar("error_code", { length: 40 }),
    errorMessage: varchar("error_message", { length: 300 }),
    contentSha256: varchar("content_sha256", { length: 64 }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("comm_tx_reference_uidx").on(t.communicationReference),
    uniqueIndex("comm_tx_tenant_idem_uidx").on(t.tenantId, t.idempotencyKey),
    index("comm_tx_tenant_created_idx").on(t.tenantId, t.createdAt),
    index("comm_tx_tenant_status_idx").on(t.tenantId, t.status),
    index("comm_tx_provider_msg_idx").on(t.providerMessageId),
    index("comm_tx_correlation_idx").on(t.correlationId),
    index("comm_tx_business_idx").on(t.tenantId, t.businessEntityType, t.businessEntityId),
    index("comm_tx_due_idx").on(t.status, t.nextAttemptAt),
  ],
);

export const communicationAttempts = mysqlTable(
  "communication_attempts",
  {
    id: id(),
    tenantId: tenantId(),
    communicationTransactionId: char("communication_transaction_id", { length: 36 }).notNull(),
    attemptNumber: int("attempt_number").notNull(),
    provider: varchar("provider", { length: 20 }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 128 }),
    startedAt: datetime("started_at", { mode: "string", fsp: 3 }).notNull(),
    completedAt: datetime("completed_at", { mode: "string", fsp: 3 }),
    durationMs: int("duration_ms"),
    httpStatus: int("http_status"),
    status: varchar("status", { length: 32 }).notNull(),
    errorCategory: varchar("error_category", { length: 40 }),
    errorCode: varchar("error_code", { length: 40 }),
    errorMessage: varchar("error_message", { length: 300 }),
    requestSha256: varchar("request_sha256", { length: 64 }),
    responseSha256: varchar("response_sha256", { length: 64 }),
    ...timestamps,
  },
  (t) => [
    index("comm_attempt_tx_idx").on(t.communicationTransactionId),
    index("comm_attempt_tenant_idx").on(t.tenantId),
  ],
);

export const communicationProviderEvents = mysqlTable(
  "communication_provider_events",
  {
    id: id(),
    tenantId: char("tenant_id", { length: 36 }),
    provider: varchar("provider", { length: 20 }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 128 }).notNull(),
    eventType: varchar("event_type", { length: 40 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    eventTimestamp: varchar("event_timestamp", { length: 40 }).notNull().default(""),
    communicationTransactionId: char("communication_transaction_id", { length: 36 }),
    receivedAt: datetime("received_at", { mode: "string", fsp: 3 }).notNull(),
    processedAt: datetime("processed_at", { mode: "string", fsp: 3 }),
    signatureValid: boolean("signature_valid").notNull().default(false),
    payloadSha256: varchar("payload_sha256", { length: 64 }).notNull(),
    processingStatus: varchar("processing_status", { length: 32 }).notNull(),
    errorCode: varchar("error_code", { length: 40 }),
    errorMessage: varchar("error_message", { length: 300 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("comm_event_dedup_uidx").on(
      t.provider,
      t.providerMessageId,
      t.status,
      t.eventTimestamp,
    ),
    index("comm_event_tx_idx").on(t.communicationTransactionId),
    index("comm_event_msg_idx").on(t.providerMessageId),
  ],
);

/** Singleton platform WhatsApp settings. Secrets are ciphertext. */
export const platformIntegrationConfig = mysqlTable("platform_integration_config", {
  id: id(),
  whatsappProvider: varchar("whatsapp_provider", { length: 20 }).notNull().default("stub"),
  twilioAccountSid: varchar("twilio_account_sid", { length: 40 }),
  twilioApiKeySid: varchar("twilio_api_key_sid", { length: 40 }),
  twilioApiKeySecretEnc: text("twilio_api_key_secret_enc"),
  twilioAuthTokenEnc: text("twilio_auth_token_enc"),
  twilioWhatsappFrom: varchar("twilio_whatsapp_from", { length: 32 }),
  twilioContentSidsJson: text("twilio_content_sids_json"),
  gupshupSource: varchar("gupshup_source", { length: 20 }),
  gupshupAppName: varchar("gupshup_app_name", { length: 80 }),
  gupshupApiKeyEnc: text("gupshup_api_key_enc"),
  gupshupTemplateIdsJson: text("gupshup_template_ids_json"),
  metaPhoneNumberId: varchar("meta_phone_number_id", { length: 40 }),
  metaVerifyTokenEnc: text("meta_verify_token_enc"),
  metaTokenEnc: text("meta_token_enc"),
  metaAppSecretEnc: text("meta_app_secret_enc"),
  metaTemplateNamesJson: text("meta_template_names_json"),
  dailySendCap: int("daily_send_cap").notNull().default(200),
  statusCallbackBaseUrl: varchar("status_callback_base_url", { length: 300 }),
  ...timestamps,
});

