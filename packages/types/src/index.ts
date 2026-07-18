export type Role = "admin" | "resident" | "superadmin";

export type ComplaintStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed";

export type ComplaintType =
  | "electric"
  | "plumbing"
  | "housekeeping"
  | "security"
  | "lift"
  | "other";

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type UserDto = {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  username: string | null;
  role: Role;
  tenantId: string;
  flatId: string | null;
  flatNumber: string | null;
  hasPin: boolean;
};

export type ComplaintCommentDto = {
  id: string;
  complaintId: string;
  userId: string;
  authorName: string | null;
  body: string;
  createdAt: string;
};

export type ComplaintDto = {
  id: string;
  ticketNumber: string;
  title: string;
  type: ComplaintType;
  typeOtherText: string | null;
  description: string;
  status: ComplaintStatus;
  flatId: string;
  flatNumber: string;
  residentName: string | null;
  assignedToUserId: string | null;
  slaDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: ComplaintAttachmentDto[];
  comments: ComplaintCommentDto[];
};

export type ComplaintAttachmentDto = {
  id: string;
  contentKind: "image" | "video";
  contentType: string;
  url: string;
  byteSize: number;
};

export type FlatDto = {
  id: string;
  number: string;
  wingName: string | null;
  wingId?: string;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export type MembershipDto = {
  tenantId: string;
  societyName: string;
  role: Role;
};

export type SocietyDto = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  pincode: string | null;
  chairpersonName: string | null;
  chairpersonEmail: string | null;
  chairpersonPhone: string | null;
  timezone: string;
  createdAt: string;
};

export type BuildingDto = {
  id: string;
  name: string;
  wingCount?: number;
};

export type WingDto = {
  id: string;
  name: string;
  buildingId: string;
  flatCount?: number;
};

export type InvitationStatus = "pending" | "accepted" | "revoked";

export type InvitationDto = {
  id: string;
  email: string | null;
  phone: string | null;
  role: Role;
  status: InvitationStatus;
  createdAt: string;
  /** Only present in DEV_AUTH so testers can accept without email/SMS delivery. */
  devToken?: string;
};

export type ResidentProfileDto = {
  userId: string;
  emergencyContact: string | null;
  vehicleNumber: string | null;
};

export type BillStatus = "draft" | "issued" | "paid" | "void" | "corrected";

export type BillDto = {
  id: string;
  flatId: string;
  flatNumber: string;
  periodYm: string;
  amountPaise: number;
  status: BillStatus;
  notes: string | null;
  createdAt: string;
};

export type PaymentMethod = "razorpay" | "cash" | "cheque" | "neft";
export type PaymentStatus = "pending" | "success" | "failed";

export type PaymentDto = {
  id: string;
  billId: string | null;
  flatId: string;
  flatNumber: string | null;
  amountPaise: number;
  method: PaymentMethod;
  status: PaymentStatus;
  receiptNumber: string | null;
  createdAt: string;
};

export type ReceiptDto = {
  receiptNumber: string;
  paymentId: string;
  flatNumber: string;
  amountPaise: number;
  method: PaymentMethod;
  paidAt: string;
};

export type NoticeAudience = "all" | "wing" | "flat";

export type NoticeDto = {
  id: string;
  title: string;
  body: string;
  audience: NoticeAudience;
  wingId: string | null;
  flatId: string | null;
  publishedAt: string | null;
  unpublishedAt: string | null;
  createdAt: string;
};

export type NotificationDto = {
  id: string;
  title: string;
  body: string;
  kind: string;
  readAt: string | null;
  linkPath: string | null;
  createdAt: string;
};

export type AuditLogDto = {
  id: string;
  actorUserId: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  meta: string | null;
  createdAt: string;
};

export type TeamMemberDto = {
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
};

export type VisitorDto = {
  id: string;
  flatId: string;
  flatNumber: string | null;
  visitorName: string;
  phone: string | null;
  purpose: string | null;
  expectedAt: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  createdAt: string;
};

export type ParkingSlotDto = {
  id: string;
  flatId: string | null;
  flatNumber: string | null;
  slotNumber: string;
  vehicleNumber: string | null;
  type: string;
  createdAt: string;
};

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type BookingDto = {
  id: string;
  facilityName: string;
  flatId: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  createdAt: string;
};

export type AssetDto = {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  purchaseDate: string | null;
  value: number | null;
  notes: string | null;
  createdAt: string;
};

export type VendorDto = {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
};

export type EventDto = {
  id: string;
  title: string;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  location: string | null;
  createdAt: string;
};

export type DashboardStatsDto = {
  openComplaints: number;
  totalComplaints: number;
  duesOutstandingPaise: number;
  upcomingBookings: number;
  publishedNotices: number;
  unreadNotifications: number;
};
