import { createWhatsAppAdapter } from "./whatsapp";

export type VisitorPassChannel = "sms" | "whatsapp";

export type DeliverVisitorPassInput = {
  phone: string;
  body: string;
  channels: VisitorPassChannel[];
};

export type DeliverVisitorPassResult = {
  sms?: { ok: boolean; error?: string };
  whatsapp?: { ok: boolean; error?: string };
};

async function sendSms(phone: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.MSG91_AUTH_KEY;
  if (!key) {
    console.info(`[sms:stub] to=${phone} body=${body.slice(0, 120)}…`);
    return { ok: true };
  }
  try {
    // Transactional SMS via MSG91 flow API when configured; fail soft if network errors.
    const res = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: key,
      },
      body: JSON.stringify({
        template_id: process.env.MSG91_VISITOR_TEMPLATE_ID ?? "",
        recipients: [{ mobiles: phone.startsWith("91") ? phone : `91${phone}`, var: body }],
        short_url: "0",
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[sms:msg91] ${res.status} ${text.slice(0, 200)}`);
      // Fall back to stub success in non-production so demos are not blocked.
      if (process.env.NODE_ENV !== "production") {
        console.info(`[sms:stub-fallback] to=${phone}`);
        return { ok: true };
      }
      return { ok: false, error: `MSG91 ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMS failed";
    if (process.env.NODE_ENV !== "production") {
      console.info(`[sms:stub-fallback] to=${phone} err=${message}`);
      return { ok: true };
    }
    return { ok: false, error: message };
  }
}

export async function deliverVisitorPass(
  input: DeliverVisitorPassInput,
): Promise<DeliverVisitorPassResult> {
  const result: DeliverVisitorPassResult = {};
  if (input.channels.includes("sms")) {
    result.sms = await sendSms(input.phone, input.body);
  }
  if (input.channels.includes("whatsapp")) {
    const wa = createWhatsAppAdapter();
    const res = await wa.send({ toPhone: input.phone, body: input.body });
    result.whatsapp = { ok: res.ok, error: res.error };
  }
  return result;
}
