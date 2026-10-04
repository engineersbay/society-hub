import { createEmailAdapter } from "./email";
import { enqueueWhatsApp } from "./communication-service";
import type { InviteDeliveryChannel, InviteDeliveryResult } from "./invite-delivery";

export type OnboardWelcomeInput = {
  tenantId?: string;
  userId?: string;
  societyName: string;
  residentName: string;
  email?: string | null;
  phone?: string | null;
  channels: InviteDeliveryChannel[];
};

function loginUrl() {
  const base =
    process.env.PUBLIC_APP_URL ??
    process.env.VITE_APP_ORIGIN ??
    "http://app.localhost:5173";
  return `${base.replace(/\/$/, "")}/login`;
}

/** Welcome message after staff onboard — no invitation token or accept step. */
export async function deliverOnboardWelcome(
  input: OnboardWelcomeInput,
): Promise<InviteDeliveryResult> {
  const link = loginUrl();
  const who = input.residentName.trim() || "there";
  const text =
    `Hi ${who}, you are registered at ${input.societyName} on SocietyHub.\n` +
    `Sign in with your mobile OTP to raise complaints: ${link}`;
  const result: InviteDeliveryResult = {};

  if (input.channels.includes("email") && input.email) {
    const email = createEmailAdapter();
    const res = await email.send({
      to: input.email,
      subject: `Welcome to ${input.societyName} on SocietyHub`,
      text,
      html: `<p>Hi <strong>${who}</strong>, you are registered at <strong>${input.societyName}</strong> on SocietyHub.</p>
<p><a href="${link}">Sign in</a> with your mobile OTP to raise complaints.</p>`,
    });
    result.email = { ok: res.ok, error: res.error };
  }

  if (input.channels.includes("whatsapp") && input.phone && input.tenantId && input.userId) {
    const link = loginUrl();
    const res = await enqueueWhatsApp({
      tenantId: input.tenantId,
      userId: input.userId,
      phone: input.phone,
      templateKey: "onboard_welcome_v1",
      variables: {
        residentName: input.residentName.trim() || "there",
        societyName: input.societyName,
        link,
      },
      businessEntityType: "user",
      businessEntityId: input.userId,
      businessEventType: "onboard_welcome",
      preferenceMode: "explicit",
    });
    result.whatsapp = { ok: res.ok, error: res.error };
  } else if (input.channels.includes("whatsapp") && input.phone && !input.tenantId) {
    result.whatsapp = { ok: true };
  }

  return result;
}
