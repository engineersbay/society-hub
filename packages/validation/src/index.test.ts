import { describe, expect, test } from "bun:test";
import {
  changePasswordSchema,
  createComplaintSchema,
  forgotPasswordSchema,
  googleAuthSchema,
  listQuerySchema,
  loginPasswordSchema,
  loginPinSchema,
  onboardResidentSchema,
  refreshSchema,
  requestOtpSchema,
  resetPasswordSchema,
  setPinSchema,
  updateComplaintStatusSchema,
  verifyOtpSchema,
} from "./index";

describe("validation schemas", () => {
  test("requestOtpSchema accepts valid phone", () => {
    expect(requestOtpSchema.parse({ phone: "8888888888" }).phone).toBe(
      "8888888888",
    );
  });

  test("requestOtpSchema rejects short phone", () => {
    expect(() => requestOtpSchema.parse({ phone: "123" })).toThrow();
  });

  test("verifyOtpSchema", () => {
    expect(
      verifyOtpSchema.parse({ phone: "8888888888", code: "123456" }).code,
    ).toBe("123456");
  });

  test("setPinSchema and loginPinSchema", () => {
    expect(setPinSchema.parse({ pin: "1234" }).pin).toBe("1234");
    expect(() => setPinSchema.parse({ pin: "12" })).toThrow();
    expect(
      loginPinSchema.parse({ phone: "8888888888", pin: "123456" }).pin,
    ).toBe("123456");
  });

  test("loginPasswordSchema", () => {
    expect(
      loginPasswordSchema.parse({
        email: "a@b.com",
        password: "Test@1234",
      }).email,
    ).toBe("a@b.com");
    expect(() =>
      loginPasswordSchema.parse({ email: "bad", password: "short" }),
    ).toThrow();
  });

  test("forgot/reset/change password schemas", () => {
    expect(forgotPasswordSchema.parse({ email: "a@b.com" }).email).toBe(
      "a@b.com",
    );
    expect(
      resetPasswordSchema.parse({
        email: "a@b.com",
        code: "123456",
        newPassword: "Test@1234",
      }).code,
    ).toBe("123456");
    expect(
      changePasswordSchema.parse({
        currentPassword: "Test@1234",
        newPassword: "NewPass@12",
      }).newPassword,
    ).toBe("NewPass@12");
  });

  test("refresh and google schemas", () => {
    expect(refreshSchema.parse({ refreshToken: "x".repeat(20) }).refreshToken)
      .toHaveLength(20);
    expect(googleAuthSchema.parse({ idToken: "dev:8888888888" }).idToken).toBe(
      "dev:8888888888",
    );
  });

  test("onboardResidentSchema", () => {
    const flatId = "66666666-6666-6666-6666-666666666666";
    expect(
      onboardResidentSchema.parse({
        name: "Ravi",
        phone: "7777777777",
        flatId,
        email: "ravi@example.com",
      }).email,
    ).toBe("ravi@example.com");
  });

  test("createComplaintSchema and status update", () => {
    expect(
      createComplaintSchema.parse({
        title: "Leak",
        type: "plumbing",
        description: "Kitchen sink drip",
      }).type,
    ).toBe("plumbing");
    expect(
      updateComplaintStatusSchema.parse({ status: "resolved" }).status,
    ).toBe("resolved");
  });

  test("listQuerySchema coerces page/limit", () => {
    expect(listQuerySchema.parse({ page: "2", limit: "10" })).toEqual({
      page: 2,
      limit: 10,
    });
    expect(listQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });
});
