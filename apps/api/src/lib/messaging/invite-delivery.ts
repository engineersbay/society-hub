import { createEmailAdapter } from "./email";
import { enqueueWhatsApp } from "./communication-service";

export type InviteDeliveryChannel = "email" | "whatsapp";

export type InviteDeliveryInput = {
  tenantId?: string;
  invitationId?: string;
  societyName: string;
  inviteToken: string;
  email?: string | null;
  phone?: string | null;
  channels: InviteDeliveryChannel[];
};

export type InviteDeliveryResult = {
  email?: { ok: boolean; error?: string };
  whatsapp?: { ok: boolean; error?: string };
};

function inviteLink(token: string) {
  const base =
    process.env.PUBLIC_APP_URL ??
    process.env.VITE_APP_ORIGIN ??
    "http://app.localhost:5173";
  return `${base.replace(/\/$/, "")}/login?invite=${encodeURIComponent(token)}`;
}

export async function deliverResidentInvite(
  input: InviteDeliveryInput,
): Promise<InviteDeliveryResult> {
  const link = inviteLink(input.inviteToken);
  const text =
    `You are invited to ${input.societyName} on SocietyHub.\n` +
    `Open this link to register and raise complaints: ${link}`;
  const result: InviteDeliveryResult = {};

  if (input.channels.includes("email") && input.email) {
    const email = createEmailAdapter();
    const res = await email.send({
      to: input.email,
      subject: `Invitation to ${input.societyName}`,
      text,
      html: `<p>You are invited to <strong>${input.societyName}</strong> on SocietyHub.</p>
<p><a href="${link}">Accept invitation</a></p>`,
    });
    result.email = { ok: res.ok, error: res.error };
  }

  if (input.channels.includes("whatsapp") && input.phone && input.tenantId) {
    const link = inviteLink(input.inviteToken);
    const res = await enqueueWhatsApp({
      tenantId: input.tenantId,
      phone: input.phone,
      templateKey: "resident_invite_v1",
      variables: { societyName: input.societyName, link },
      businessEntityType: "invitation",
      businessEntityId: input.invitationId ?? input.inviteToken,
      businessEventType: "resident_invite",
      preferenceMode: "explicit",
    });
    result.whatsapp = { ok: res.ok, error: res.error };
  }

  return result;
}
