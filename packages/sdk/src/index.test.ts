import { afterEach, describe, expect, test } from "bun:test";
import { ApiClientError, createSocietyHubClient } from "./index";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("sdk client", () => {
  test("requestOtp posts phone without auth", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    globalThis.fetch = (async (url: URL | RequestInfo, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return jsonOk({ ok: true, devCode: "123456" });
    }) as typeof fetch;

    const client = createSocietyHubClient({ baseUrl: "http://api.test" });
    const res = await client.requestOtp("8888888888");
    expect(res.devCode).toBe("123456");
    expect(calls[0]?.url).toBe("http://api.test/v1/auth/otp/request");
  });

  test("verifyOtp loginPin loginGoogle loginPassword", async () => {
    const paths: string[] = [];
    globalThis.fetch = (async (url) => {
      paths.push(String(url));
      return jsonOk({
        user: { id: "1" },
        tokens: { accessToken: "a", refreshToken: "r", expiresIn: 900 },
      });
    }) as typeof fetch;
    const client = createSocietyHubClient({ baseUrl: "http://api.test" });
    await client.verifyOtp("8888888888", "123456");
    await client.loginPin("8888888888", "1234");
    await client.loginGoogle("dev:8888888888");
    await client.loginPassword("a@b.com", "Test@1234");
    expect(paths).toEqual([
      "http://api.test/v1/auth/otp/verify",
      "http://api.test/v1/auth/pin/login",
      "http://api.test/v1/auth/google",
      "http://api.test/v1/auth/password/login",
    ]);
  });

  test("authenticated helpers", async () => {
    const paths: string[] = [];
    globalThis.fetch = (async (url, init) => {
      paths.push(String(url));
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer tok");
      if (String(url).endsWith("/me")) {
        return jsonOk({
          id: "1",
          phone: null,
          email: "a@b.com",
          name: "A",
          username: null,
          role: "admin",
          tenantId: "t",
          flatId: null,
          flatNumber: null,
          hasPin: false,
        });
      }
      return jsonOk({ ok: true });
    }) as typeof fetch;

    const client = createSocietyHubClient({
      baseUrl: "http://api.test",
      getAccessToken: () => "tok",
      getRefreshToken: () => "ref",
    });
    await client.me();
    await client.setPin("1234");
    await client.changePassword("oldpass12", "newpass12");
    await client.logout("ref");
    await client.listFlats();
    await client.onboardResident({
      name: "R",
      phone: "7777777777",
      flatId: "66666666-6666-6666-6666-666666666666",
      email: "r@e.com",
    });
    await client.listComplaints(1, 10);
    await client.getComplaint("c1");
    await client.createComplaint({
      title: "Leak",
      type: "plumbing",
      description: "drip drip drip",
    });
    await client.updateComplaintStatus("c1", "resolved");
    expect(paths.length).toBeGreaterThan(8);
  });

  test("uploadAttachment uses FormData", async () => {
    globalThis.fetch = (async (_url, init) => {
      expect(init?.body).toBeInstanceOf(FormData);
      return jsonOk({ id: "c1", attachments: [] });
    }) as typeof fetch;
    const client = createSocietyHubClient({
      baseUrl: "http://api.test",
      getAccessToken: () => "tok",
    });
    const file = new File(["x"], "a.png", { type: "image/png" });
    await client.uploadAttachment("c1", file);
  });

  test("refresh helper and onTokens", async () => {
    let saved: string | null = null;
    globalThis.fetch = (async (url) => {
      if (String(url).includes("/refresh")) {
        return jsonOk({
          accessToken: "new-a",
          refreshToken: "new-r",
          expiresIn: 900,
        });
      }
      return jsonOk({ ok: true });
    }) as typeof fetch;
    const client = createSocietyHubClient({
      baseUrl: "http://api.test",
      getRefreshToken: () => "old-r",
      onTokens: (t) => {
        saved = t.accessToken;
      },
    });
    const tokens = await client.refresh("old-r");
    expect(tokens.accessToken).toBe("new-a");
    expect(saved).toBeNull();
  });

  test("auto refresh on 401 then retries", async () => {
    let n = 0;
    globalThis.fetch = (async (url, init) => {
      if (String(url).includes("/refresh")) {
        return jsonOk({
          accessToken: "new-a",
          refreshToken: "new-r",
          expiresIn: 900,
        });
      }
      n += 1;
      if (n === 1) {
        return new Response(JSON.stringify({ code: "unauthorized", message: "x" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer new-a");
      return jsonOk({
        id: "1",
        phone: null,
        email: "a@b.com",
        name: "A",
        username: null,
        role: "admin",
        tenantId: "t",
        flatId: null,
        flatNumber: null,
        hasPin: false,
      });
    }) as typeof fetch;

    let access = "old-a";
    const client = createSocietyHubClient({
      baseUrl: "http://api.test",
      getAccessToken: () => access,
      getRefreshToken: () => "ref",
      onTokens: (t) => {
        access = t.accessToken;
      },
    });
    const me = await client.me();
    expect(me.email).toBe("a@b.com");
  });

  test("throws ApiClientError on failure", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ code: "unauthorized", message: "Nope" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;

    const client = createSocietyHubClient({ baseUrl: "http://api.test" });
    try {
      await client.me();
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).status).toBe(401);
    }
  });

  test("forgotPassword and resetPassword helpers", async () => {
    const paths: string[] = [];
    globalThis.fetch = (async (url) => {
      paths.push(String(url));
      return jsonOk({ ok: true, devCode: "123456" });
    }) as typeof fetch;
    const client = createSocietyHubClient({ baseUrl: "http://api.test" });
    await client.forgotPassword("a@b.com");
    globalThis.fetch = (async (url) => {
      paths.push(String(url));
      return jsonOk({ ok: true });
    }) as typeof fetch;
    await client.resetPassword("a@b.com", "123456", "Test@1234");
    expect(paths[0]).toContain("/forgot");
    expect(paths[1]).toContain("/reset");
  });

  test("handles non-json error body", async () => {
    globalThis.fetch = (async () =>
      new Response("nope", { status: 500 })) as typeof fetch;
    const client = createSocietyHubClient({ baseUrl: "http://api.test" });
    try {
      await client.me();
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).body.code).toBe("http_error");
    }
  });
});
