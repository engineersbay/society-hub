export const COMMUNICATION_STATUSES = [
  "queued",
  "processing",
  "accepted",
  "sent",
  "delivered",
  "read",
  "undelivered",
  "failed",
  "cancelled",
] as const;

export type CommunicationStatus = (typeof COMMUNICATION_STATUSES)[number];

const TRANSITIONS: Record<CommunicationStatus, CommunicationStatus[]> = {
  queued: ["processing"],
  processing: ["accepted", "failed", "queued"],
  accepted: ["sent", "delivered", "undelivered", "failed", "read"],
  sent: ["delivered", "undelivered", "failed", "read"],
  delivered: ["read"],
  read: [],
  undelivered: [],
  failed: [],
  cancelled: [],
};

export function canTransition(from: string, to: string): boolean {
  if (!isStatus(from) || !isStatus(to)) return false;
  return TRANSITIONS[from].includes(to);
}

export function isStatus(value: string): value is CommunicationStatus {
  return (COMMUNICATION_STATUSES as readonly string[]).includes(value);
}

export type SendFailure = {
  category: string;
  retryable: boolean;
  outcome: "retry" | "failed" | "uncertain";
};

/** No provider message id means the send was not accepted. Timeout with no id is not retried. */
export function classifySendFailure(input: {
  httpStatus: number | null;
  providerMessageId?: string | null;
  timedOut: boolean;
}): SendFailure {
  if (input.providerMessageId) {
    return { category: "provider_error", retryable: false, outcome: "failed" };
  }
  if (input.timedOut) {
    return { category: "timeout_uncertain", retryable: false, outcome: "uncertain" };
  }
  const status = input.httpStatus;
  if (status === 429 || (status !== null && status >= 500)) {
    return { category: status === 429 ? "rate_limited" : "provider_error", retryable: true, outcome: "retry" };
  }
  if (status === 401 || status === 403) {
    return { category: "authentication_error", retryable: false, outcome: "failed" };
  }
  if (status === 400 || status === 404) {
    return { category: "validation_error", retryable: false, outcome: "failed" };
  }
  return { category: "unknown_error", retryable: false, outcome: "failed" };
}

const VENDOR_STATUS: Record<string, CommunicationStatus> = {
  queued: "accepted",
  accepted: "accepted",
  sending: "accepted",
  sent: "sent",
  delivered: "delivered",
  read: "read",
  undelivered: "undelivered",
  failed: "failed",
  submitted: "accepted",
};

export function mapVendorStatus(raw: string): CommunicationStatus | null {
  return VENDOR_STATUS[raw.toLowerCase()] ?? null;
}

export function backoffMs(retryCount: number): number {
  const base = 2_000 * 2 ** Math.max(0, retryCount);
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(base + jitter, 60_000);
}

export function idempotencyKey(parts: {
  tenantId: string;
  businessEntityId: string;
  businessEventType: string;
  recipientE164: string;
  templateKey: string;
}): string {
  return [
    parts.tenantId,
    parts.businessEntityId,
    parts.businessEventType,
    parts.recipientE164,
    parts.templateKey,
  ].join(":");
}

export function communicationReference(now = new Date()): string {
  const day = now.toISOString().slice(0, 10).replace(/-/g, "");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const byte of bytes) suffix += alphabet[byte % alphabet.length];
  return `SH-MSG-${day}-${suffix}`;
}
