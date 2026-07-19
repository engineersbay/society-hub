import { z } from "zod";

export const requestOtpSchema = z.object({
  phone: z.string().min(10).max(15),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().min(4).max(8),
});

export const setPinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/),
});

export const loginPinSchema = z.object({
  phone: z.string().min(10).max(15),
  pin: z.string().regex(/^\d{4,6}$/),
});

export const loginPasswordSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(200),
});

export const resetPasswordSchema = z.object({
  email: z.string().email().max(200),
  code: z.string().min(4).max(8),
  newPassword: z.string().min(8).max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(10),
});

export const selectTenantSchema = z.object({
  tenantId: z.string().uuid(),
});

export const onboardResidentSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(10).max(15),
  flatId: z.string().uuid(),
  email: z.string().email().max(200),
});

export const createComplaintSchema = z.object({
  title: z.string().min(3).max(200),
  type: z.enum([
    "electric",
    "plumbing",
    "housekeeping",
    "security",
    "lift",
    "other",
  ]),
  typeOtherText: z.string().max(120).optional().nullable(),
  description: z.string().min(3).max(5000),
  /** Required for staff/superadmin without a resident flat link. */
  flatId: z.string().uuid().optional().nullable(),
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(["open", "assigned", "in_progress", "resolved", "closed"]),
  assignedToUserId: z.string().uuid().optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

export const createComplaintCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const roleEnum = z.enum(["admin", "resident", "superadmin"]);

export const createSocietySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  pincode: z.string().max(12).optional().nullable(),
  timezone: z.string().max(64).default("Asia/Kolkata").optional(),
  chairpersonName: z.string().max(120).optional().nullable(),
  chairpersonEmail: z.string().email().max(200).optional().nullable(),
  chairpersonPhone: z.string().max(15).optional().nullable(),
  chairpersonPassword: z.string().min(8).max(128).optional(),
});

export const createBuildingSchema = z.object({
  name: z.string().min(1).max(120),
});

export const createWingSchema = z.object({
  name: z.string().min(1).max(120),
});

export const createFlatSchema = z.object({
  number: z.string().min(1).max(32),
});

export const createInvitationSchema = z.object({
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(15).optional().nullable(),
  role: roleEnum.default("resident"),
});

export const updateResidentProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  emergencyContact: z.string().max(40).optional().nullable(),
  vehicleNumber: z.string().max(32).optional().nullable(),
});

export const generateBillsSchema = z.object({
  periodYm: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM"),
  amountPaise: z.number().int().min(1),
  notes: z.string().max(1000).optional().nullable(),
  flatIds: z.array(z.string().uuid()).optional(),
});

export const voidBillSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

export const recordPaymentSchema = z.object({
  billId: z.string().uuid().optional().nullable(),
  flatId: z.string().uuid(),
  amountPaise: z.number().int().min(1),
  method: z.enum(["razorpay", "cash", "cheque", "neft"]),
  receiptNumber: z.string().max(64).optional().nullable(),
});

export const razorpayWebhookSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  status: z.enum(["success", "failed"]).default("success"),
});

export const createNoticeSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  audience: z.enum(["all", "wing", "flat"]).default("all"),
  wingId: z.string().uuid().optional().nullable(),
  flatId: z.string().uuid().optional().nullable(),
  publishNow: z.boolean().optional(),
});

export const updateNoticeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
});

export const createVisitorSchema = z.object({
  flatId: z.string().uuid().optional(),
  visitorName: z.string().min(1).max(120),
  phone: z.string().max(20).optional().nullable(),
  purpose: z.string().max(200).optional().nullable(),
  expectedAt: z.string().optional().nullable(),
});

export const createParkingSlotSchema = z.object({
  flatId: z.string().uuid().optional().nullable(),
  slotNumber: z.string().min(1).max(32),
  vehicleNumber: z.string().max(32).optional().nullable(),
  type: z.string().max(32).default("car").optional(),
});

export const createBookingSchema = z.object({
  facilityName: z.string().min(1).max(120),
  flatId: z.string().uuid().optional(),
  startAt: z.string(),
  endAt: z.string(),
});

export const createAssetSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(80).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  value: z.number().int().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(80).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  startAt: z.string().optional().nullable(),
  endAt: z.string().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
});
