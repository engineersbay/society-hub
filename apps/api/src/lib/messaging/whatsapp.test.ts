import { describe, expect, test } from "bun:test";
import { StubWhatsAppAdapter, createWhatsAppAdapter } from "./whatsapp";

describe("whatsapp adapter", () => {
  test("createWhatsAppAdapter falls back to stub without Gupshup env", () => {
    const prev = {
      key: process.env.GUPSHUP_API_KEY,
      source: process.env.GUPSHUP_SOURCE,
      app: process.env.GUPSHUP_APP_NAME,
    };
    delete process.env.GUPSHUP_API_KEY;
    delete process.env.GUPSHUP_SOURCE;
    delete process.env.GUPSHUP_APP_NAME;
    const adapter = createWhatsAppAdapter();
    expect(adapter).toBeInstanceOf(StubWhatsAppAdapter);
    process.env.GUPSHUP_API_KEY = prev.key;
    process.env.GUPSHUP_SOURCE = prev.source;
    process.env.GUPSHUP_APP_NAME = prev.app;
  });

  test("stub adapter reports ok", async () => {
    const res = await new StubWhatsAppAdapter().send({
      toPhone: "919999999999",
      body: "Hello",
    });
    expect(res.ok).toBe(true);
    expect(res.provider).toBe("stub");
  });
});
