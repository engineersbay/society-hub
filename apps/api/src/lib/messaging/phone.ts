/** India product rule: 10-digit mobiles become +91. Numbers that already include a country code must be valid E.164. */

const E164 = /^\+[1-9]\d{7,14}$/;

export function normalizePhoneE164(
  input: string,
): { ok: true; e164: string } | { ok: false; error: "invalid_recipient" } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "invalid_recipient" };

  if (trimmed.startsWith("+")) {
    return E164.test(trimmed)
      ? { ok: true, e164: trimmed }
      : { ok: false, error: "invalid_recipient" };
  }

  let digits = trimmed.replace(/[\s()-]/g, "");
  if (digits.startsWith("00")) {
    const intl = `+${digits.slice(2)}`;
    return E164.test(intl)
      ? { ok: true, e164: intl }
      : { ok: false, error: "invalid_recipient" };
  }
  digits = digits.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (digits.startsWith("91") && digits.length === 12 && /^91[6-9]\d{9}$/.test(digits)) {
    return { ok: true, e164: `+${digits}` };
  }
  if (/^[6-9]\d{9}$/.test(digits)) return { ok: true, e164: `+91${digits}` };
  return { ok: false, error: "invalid_recipient" };
}

export function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  if (last4.length < 4) return "******";
  return `******${last4}`;
}

export function last4(e164: string): string {
  return e164.replace(/\D/g, "").slice(-4);
}

export function phonesMatch(stored: string | null | undefined, e164: string): boolean {
  if (!stored) return false;
  const normalized = normalizePhoneE164(stored);
  return normalized.ok && normalized.e164 === e164;
}
