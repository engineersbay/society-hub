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
    user: { id: string; role: string };
    tokens: { accessToken: string };
  };
}

describe("api smoke", () => {
  beforeAll(async () => {
    const health = await fetch(`${base}/health`);
    if (!health.ok) {
      throw new Error(
        `API not reachable at ${base}. Start with: bun run --filter=@society-hub/api dev`,
      );
    }
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
});
