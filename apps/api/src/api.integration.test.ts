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

  test("superadmin memberships list and select-tenant", async () => {
    const session = await passwordLogin(
      "superadmin@societyhub.local",
      "Test@1234",
    );
    const memberships = await fetch(`${base}/v1/auth/memberships`, {
      headers: { Authorization: `Bearer ${session.tokens.accessToken}` },
    });
    expect(memberships.ok).toBe(true);
    const list = (await memberships.json()) as {
      tenantId: string;
      role: string;
    }[];
    expect(list.length).toBeGreaterThan(0);

    const select = await fetch(`${base}/v1/auth/select-tenant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.tokens.accessToken}`,
      },
      body: JSON.stringify({ tenantId: list[0]!.tenantId }),
    });
    expect(select.ok).toBe(true);
    const selected = (await select.json()) as {
      user: { tenantId: string };
      tokens: { accessToken: string };
    };
    expect(selected.user.tenantId).toBe(list[0]!.tenantId);
  });

  test("superadmin can create a society via manage flow", async () => {
    const session = await passwordLogin(
      "superadmin@societyhub.local",
      "Test@1234",
    );
    const suffix = Date.now();
    const res = await fetch(`${base}/v1/societies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.tokens.accessToken}`,
      },
      body: JSON.stringify({
        name: `Coverage Society ${suffix}`,
        address: "1 Test Lane",
        city: "Pune",
        pincode: "411057",
        chairpersonName: "Test Chair",
        chairpersonEmail: `chair-${suffix}@example.com`,
        chairpersonPhone: `7${String(suffix).slice(-9)}`,
      }),
    });
    expect(res.ok).toBe(true);
    const society = (await res.json()) as { id: string; name: string };
    expect(society.name).toContain("Coverage Society");

    const getRes = await fetch(`${base}/v1/societies/${society.id}`, {
      headers: { Authorization: `Bearer ${session.tokens.accessToken}` },
    });
    expect(getRes.ok).toBe(true);

    const buildingsRes = await fetch(
      `${base}/v1/societies/${society.id}/buildings`,
      { headers: { Authorization: `Bearer ${session.tokens.accessToken}` } },
    );
    expect(buildingsRes.ok).toBe(true);
    const buildingList = (await buildingsRes.json()) as { id: string }[];
    expect(buildingList.length).toBeGreaterThan(0);
  });

  test("admin can generate bills and resident can pay a bill (mock)", async () => {
    const admin = await otpLogin("9999999999");
    // Unique YYYY-MM so re-runs never hit an already-paid period for flat 101.
    const periodYm = `${2300 + (Date.now() % 600)}-${String((Date.now() % 12) + 1).padStart(2, "0")}`;
    const generate = await fetch(`${base}/v1/bills/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${admin.tokens.accessToken}`,
      },
      body: JSON.stringify({ periodYm, amountPaise: 500000 }),
    });
    expect(generate.ok).toBe(true);
    const generated = (await generate.json()) as { created: number };
    expect(generated.created).toBeGreaterThan(0);

    const resident = await otpLogin("8888888888");
    const mine = await fetch(`${base}/v1/bills/mine`, {
      headers: { Authorization: `Bearer ${resident.tokens.accessToken}` },
    });
    expect(mine.ok).toBe(true);
    const bills = (await mine.json()) as {
      id: string;
      periodYm: string;
      status: string;
    }[];
    const bill = bills.find(
      (b) => b.periodYm === periodYm && b.status !== "paid",
    );
    expect(bill).toBeTruthy();

    const pay = await fetch(`${base}/v1/payments/mock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resident.tokens.accessToken}`,
      },
      body: JSON.stringify({ billId: bill!.id }),
    });
    expect(pay.ok).toBe(true);
    const payment = (await pay.json()) as { status: string };
    expect(payment.status).toBe("success");
  });

  test("notices: admin publishes, resident sees it, marks read", async () => {
    const admin = await otpLogin("9999999999");
    const create = await fetch(`${base}/v1/notices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${admin.tokens.accessToken}`,
      },
      body: JSON.stringify({
        title: "Water supply maintenance",
        body: "No water tomorrow 10am-2pm",
        audience: "all",
      }),
    });
    expect(create.ok).toBe(true);
    const notice = (await create.json()) as { id: string };

    const publish = await fetch(`${base}/v1/notices/${notice.id}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${admin.tokens.accessToken}` },
    });
    expect(publish.ok).toBe(true);

    const resident = await otpLogin("8888888888");
    const list = await fetch(`${base}/v1/notices`, {
      headers: { Authorization: `Bearer ${resident.tokens.accessToken}` },
    });
    expect(list.ok).toBe(true);
    const notices = (await list.json()) as { id: string }[];
    expect(notices.some((n) => n.id === notice.id)).toBe(true);

    const read = await fetch(`${base}/v1/notices/${notice.id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${resident.tokens.accessToken}` },
    });
    expect(read.ok).toBe(true);
  });

  test("dashboard stats and audit log visibility for staff", async () => {
    const admin = await otpLogin("9999999999");
    const stats = await fetch(`${base}/v1/dashboard/stats`, {
      headers: { Authorization: `Bearer ${admin.tokens.accessToken}` },
    });
    expect(stats.ok).toBe(true);
    const statsBody = (await stats.json()) as { totalComplaints: number };
    expect(statsBody.totalComplaints).toBeGreaterThanOrEqual(0);

    const audit = await fetch(`${base}/v1/audit`, {
      headers: { Authorization: `Bearer ${admin.tokens.accessToken}` },
    });
    expect(audit.ok).toBe(true);
    const auditLogs = (await audit.json()) as { action: string }[];
    expect(Array.isArray(auditLogs)).toBe(true);
  });

  test("complaint comments and assignment flow", async () => {
    const resident = await otpLogin("8888888888");
    const created = await fetch(`${base}/v1/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resident.tokens.accessToken}`,
      },
      body: JSON.stringify({
        title: "Security gate broken",
        type: "security",
        description: "Main gate not closing",
      }),
    });
    const complaint = (await created.json()) as { id: string };

    const admin = await otpLogin("9999999999");
    const assign = await fetch(`${base}/v1/complaints/${complaint.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${admin.tokens.accessToken}`,
      },
      body: JSON.stringify({ status: "assigned" }),
    });
    expect(assign.ok).toBe(true);
    const assigned = (await assign.json()) as {
      status: string;
      assignedToUserId: string | null;
    };
    expect(assigned.status).toBe("assigned");
    expect(assigned.assignedToUserId).toBeTruthy();

    const comment = await fetch(
      `${base}/v1/complaints/${complaint.id}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${admin.tokens.accessToken}`,
        },
        body: JSON.stringify({ body: "Technician dispatched" }),
      },
    );
    expect(comment.ok).toBe(true);
    const withComment = (await comment.json()) as {
      comments: { body: string }[];
    };
    expect(withComment.comments.some((c) => c.body === "Technician dispatched")).toBe(
      true,
    );
  });
});
