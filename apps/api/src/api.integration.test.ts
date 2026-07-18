import { beforeAll, describe, expect, test } from "bun:test";

const base = process.env.API_URL ?? "http://127.0.0.1:3000";

async function otpLogin(phone: string) {
  await fetch(`${base}/v1/auth/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const verify = await fetch(`${base}/v1/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code: "123456" }),
  });
  expect(verify.ok).toBe(true);
  return (await verify.json()) as {
    user: { id: string; role: string; flatId: string | null };
    tokens: { accessToken: string; refreshToken: string };
  };
}

async function passwordLogin(email: string, password: string) {
  const res = await fetch(`${base}/v1/auth/password/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  expect(res.ok).toBe(true);
  return (await res.json()) as {
    user: { role: string; email: string | null };
    tokens: { accessToken: string; refreshToken: string };
  };
}

describe("api integration", () => {
  beforeAll(async () => {
    const health = await fetch(`${base}/health`);
    if (!health.ok) {
      throw new Error(
        `API not reachable at ${base}. Start with: bun run --filter=@society-hub/api dev`,
      );
    }
  });

  test("health endpoint", async () => {
    const res = await fetch(`${base}/health`);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("resident can create and list complaint", async () => {
    const { tokens } = await otpLogin("8888888888");
    const create = await fetch(`${base}/v1/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      body: JSON.stringify({
        title: "Leaking tap",
        type: "plumbing",
        description: "Kitchen sink drip overnight",
      }),
    });
    expect(create.status).toBe(200);
    const complaint = (await create.json()) as { id: string; status: string };
    expect(complaint.status).toBe("open");

    const list = await fetch(`${base}/v1/complaints?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    expect(list.ok).toBe(true);
    const body = (await list.json()) as { items: { id: string }[] };
    expect(body.items.some((i) => i.id === complaint.id)).toBe(true);

    const detail = await fetch(`${base}/v1/complaints/${complaint.id}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    expect(detail.ok).toBe(true);
  });

  test("admin can list all and update status", async () => {
    const resident = await otpLogin("8888888888");
    const created = await fetch(`${base}/v1/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resident.tokens.accessToken}`,
      },
      body: JSON.stringify({
        title: "Lift stuck",
        type: "lift",
        description: "Tower A lift not moving",
      }),
    });
    const complaint = (await created.json()) as { id: string };

    const admin = await otpLogin("9999999999");
    const patch = await fetch(`${base}/v1/complaints/${complaint.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${admin.tokens.accessToken}`,
      },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(patch.ok).toBe(true);
    const updated = (await patch.json()) as { status: string };
    expect(updated.status).toBe("in_progress");
  });

  test("superadmin can login with email and password", async () => {
    const body = await passwordLogin(
      "superadmin@societyhub.local",
      "Test@1234",
    );
    expect(body.user.role).toBe("superadmin");
    expect(body.user.email).toBe("superadmin@societyhub.local");
    expect(body.tokens.accessToken.length).toBeGreaterThan(20);
  });

  test("forgot and reset password flow", async () => {
    const forgot = await fetch(`${base}/v1/auth/password/forgot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "superadmin@societyhub.local" }),
    });
    expect(forgot.ok).toBe(true);
    const forgotBody = (await forgot.json()) as { ok: true; devCode?: string };
    expect(forgotBody.devCode).toBe("123456");

    const reset = await fetch(`${base}/v1/auth/password/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "superadmin@societyhub.local",
        code: "123456",
        newPassword: "Test@1234",
      }),
    });
    expect(reset.ok).toBe(true);
  });

  test("set pin and login with pin", async () => {
    const session = await otpLogin("8888888888");
    const setPin = await fetch(`${base}/v1/auth/pin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.tokens.accessToken}`,
      },
      body: JSON.stringify({ pin: "4321" }),
    });
    expect(setPin.ok).toBe(true);

    const pinLogin = await fetch(`${base}/v1/auth/pin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "8888888888", pin: "4321" }),
    });
    expect(pinLogin.ok).toBe(true);
  });

  test("refresh and logout", async () => {
    const session = await passwordLogin(
      "superadmin@societyhub.local",
      "Test@1234",
    );
    const refresh = await fetch(`${base}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.tokens.refreshToken }),
    });
    expect(refresh.ok).toBe(true);
    const tokens = (await refresh.json()) as {
      accessToken: string;
      refreshToken: string;
    };

    const logout = await fetch(`${base}/v1/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    expect(logout.ok).toBe(true);
  });

  test("auth me and google dev login", async () => {
    const session = await otpLogin("9999999999");
    const me = await fetch(`${base}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${session.tokens.accessToken}` },
    });
    expect(me.ok).toBe(true);

    const google = await fetch(`${base}/v1/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "dev:8888888888" }),
    });
    expect(google.ok).toBe(true);
  });

  test("admin lists flats and onboards resident with email", async () => {
    const admin = await otpLogin("9999999999");
    const flatsRes = await fetch(`${base}/v1/admin/flats`, {
      headers: { Authorization: `Bearer ${admin.tokens.accessToken}` },
    });
    expect(flatsRes.ok).toBe(true);
    const flats = (await flatsRes.json()) as { id: string }[];
    expect(flats.length).toBeGreaterThan(0);

    const phone = `9${String(Date.now()).slice(-9)}`;
    const onboard = await fetch(`${base}/v1/admin/residents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${admin.tokens.accessToken}`,
      },
      body: JSON.stringify({
        name: "Coverage Resident",
        phone,
        flatId: flats[0]!.id,
        email: `cov-${Date.now()}@example.com`,
      }),
    });
    expect(onboard.ok).toBe(true);
  });

  test("validation error shape", async () => {
    const res = await fetch(`${base}/v1/auth/password/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bad", password: "x" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("validation_error");
  });
});
