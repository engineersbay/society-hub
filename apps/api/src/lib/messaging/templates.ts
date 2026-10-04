import { createHash } from "node:crypto";

export type TemplateKey =
  | "visitor_pass_v1"
  | "resident_invite_v1"
  | "onboard_welcome_v1"
  | "complaint_staff_v1"
  | "payment_credited_v1"
  | "payment_rejected_v1"
  | "bill_ready_v1";

export const WHATSAPP_TEMPLATES: Record<
  TemplateKey,
  { version: string; required: string[] }
> = {
  visitor_pass_v1: { version: "1", required: ["societyName", "otp", "link"] },
  resident_invite_v1: { version: "1", required: ["societyName", "link"] },
  onboard_welcome_v1: { version: "1", required: ["residentName", "societyName", "link"] },
  complaint_staff_v1: {
    version: "1",
    required: ["ticketNumber", "societyName", "flatNumber", "title", "link"],
  },
  payment_credited_v1: { version: "1", required: ["amount", "receiptNumber"] },
  payment_rejected_v1: { version: "1", required: ["note"] },
  bill_ready_v1: { version: "1", required: ["amount", "period"] },
};

const SENSITIVE = new Set(["otp", "code", "pin"]);

export function isTemplateKey(value: string): value is TemplateKey {
  return Object.prototype.hasOwnProperty.call(WHATSAPP_TEMPLATES, value);
}

export function validateTemplateVariables(
  templateKey: string,
  variables: Record<string, string>,
): { ok: true; version: string } | { ok: false; error: "template_error"; missing: string[] } {
  if (!isTemplateKey(templateKey)) {
    return { ok: false, error: "template_error", missing: [templateKey] };
  }
  const spec = WHATSAPP_TEMPLATES[templateKey];
  const missing = spec.required.filter((name) => {
    const value = variables[name];
    return typeof value !== "string" || value.trim().length === 0 || value.length > 500;
  });
  if (missing.length > 0) return { ok: false, error: "template_error", missing };
  return { ok: true, version: spec.version };
}

/** Numbered body params in template variable order. OTP stays inside the provider request only. */
export function numberedContentVariables(
  templateKey: TemplateKey,
  variables: Record<string, string>,
): Record<string, string> {
  const numbered: Record<string, string> = {};
  WHATSAPP_TEMPLATES[templateKey].required.forEach((name, index) => {
    numbered[String(index + 1)] = variables[name] ?? "";
  });
  return numbered;
}

export function contentSha256(variables: Record<string, string>): string {
  const keys = Object.keys(variables).sort();
  const canonical = JSON.stringify(keys.map((key) => [key, variables[key]]));
  return createHash("sha256").update(canonical).digest("hex");
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Drop OTP-like keys before anything is written to logs. */
export function redactVariables(variables: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    out[key] = SENSITIVE.has(key) ? "[redacted]" : value;
  }
  return out;
}
