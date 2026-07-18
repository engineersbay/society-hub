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

export const onboardResidentSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(10).max(15),
  flatId: z.string().uuid(),
  email: z.string().email().optional().nullable(),
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
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
