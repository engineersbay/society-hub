import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { ActivityType, recordActivity } from "../audit";
import { db } from "../../db/client";
import {
  communicationAttempts,
  communicationProviderEvents,
  communicationTransactions,
  invitations,
  residentProfiles,
  userRoles,
  users,
  visitors,
} from "../../db/schema";
import { parseCommunicationPreferences } from "../../modules/residents/repository";
import { loadWhatsAppRuntime, type WhatsAppRuntimeConfig } from "./integration-config";
import { last4, maskPhone, normalizePhoneE164, phonesMatch } from "./phone";
import {
  GupshupWhatsAppProvider,
  MetaWhatsAppProvider,
  StubWhatsAppProvider,
  TwilioWhatsAppProvider,
  type ProviderStatusUpdate,
  type WhatsAppProvider,
  type WhatsAppProviderId,
} from "./providers";
import {
  backoffMs,
  canTransition,
  classifySendFailure,
  communicationReference,
  idempotencyKey,
  type CommunicationStatus,
} from "./status";
import {
  contentSha256,
  isTemplateKey,
  validateTemplateVariables,
  type TemplateKey,
} from "./templates";

export type EnqueueWhatsAppInput = {
  tenantId: string;
  actorUserId?: string | null;
  userId?: string | null;
  phone: string;
  templateKey: TemplateKey;
  language?: string;
  variables: Record<string, string>;
  businessEntityType: string;
  businessEntityId: string;
  businessEventType: string;
  preferenceMode: "explicit" | "opt_in";
};

export type EnqueueWhatsAppResult = {
  ok: boolean;
  id?: string;
  status?: string;
  error?: string;
  duplicate?: boolean;
};

function nowMysql(date = new Date()): string {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

function isDuplicateError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("Duplicate") || message.includes("comm_tx_tenant_idem_uidx");
}

function providerFor(config: WhatsAppRuntimeConfig, id: WhatsAppProviderId): WhatsAppProvider {
  if (id === "twilio") {
    return new TwilioWhatsAppProvider({
      accountSid: config.twilio.accountSid,
      apiKeySid: config.twilio.apiKeySid,
      apiKeySecret: config.twilio.apiKeySecret,
      authToken: config.twilio.authToken,
      from: config.twilio.from,
    });
  }
  if (id === "gupshup") {
    return new GupshupWhatsAppProvider({
      apiKey: config.gupshup.apiKey,
      source: config.gupshup.source,
      appName: config.gupshup.appName,
    });
  }
  if (id === "meta") {
    return new MetaWhatsAppProvider({
      token: config.meta.token,
      phoneNumberId: config.meta.phoneNumberId,
      appSecret: config.meta.appSecret,
      verifyToken: config.meta.verifyToken,
    });
  }
  return new StubWhatsAppProvider();
}

function externalTemplateId(config: WhatsAppRuntimeConfig, key: TemplateKey): string {
  if (config.provider === "twilio") return config.twilio.contentSids[key] ?? "";
  if (config.provider === "gupshup") return config.gupshup.templateIds[key] ?? "";
  if (config.provider === "meta") return config.meta.templateNames[key] ?? "";
  return "stub";
}

async function recipientAllowed(
  tenantId: string,
  e164: string,
  userId?: string | null,
): Promise<boolean> {
  if (userId) {
    const [role] = await db
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.tenantId, tenantId),
          eq(userRoles.userId, userId),
          eq(userRoles.isDeleted, false),
        ),
      )
      .limit(1);
    if (!role) return false;
    const [user] = await db
      .select({ phone: users.phone })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .limit(1);
    return phonesMatch(user?.phone, e164);
  }

  const people = await db
    .select({ phone: users.phone })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .where(and(eq(userRoles.tenantId, tenantId), eq(userRoles.isDeleted, false), eq(users.isDeleted, false)))
    .limit(500);
  if (people.some((row) => phonesMatch(row.phone, e164))) return true;

  const invites = await db
    .select({ phone: invitations.phone })
    .from(invitations)
    .where(and(eq(invitations.tenantId, tenantId), eq(invitations.isDeleted, false)))
    .limit(500);
  if (invites.some((row) => phonesMatch(row.phone, e164))) return true;

  const guest = await db
    .select({ phone: visitors.phone })
    .from(visitors)
    .where(and(eq(visitors.tenantId, tenantId), eq(visitors.isDeleted, false)))
    .limit(500);
  return guest.some((row) => phonesMatch(row.phone, e164));
}

export async function enqueueWhatsApp(input: EnqueueWhatsAppInput): Promise<EnqueueWhatsAppResult> {
  try {
    const phone = normalizePhoneE164(input.phone);
    if (!phone.ok) return { ok: false, error: "invalid_recipient" };
    const template = validateTemplateVariables(input.templateKey, input.variables);
    if (!template.ok) return { ok: false, error: "template_error" };

    const allowed = await recipientAllowed(input.tenantId, phone.e164, input.userId);
    if (!allowed) return { ok: false, error: "recipient_not_in_tenant" };

    const config = await loadWhatsAppRuntime();
    const key = idempotencyKey({
      tenantId: input.tenantId,
      businessEntityId: input.businessEntityId,
      businessEventType: input.businessEventType,
      recipientE164: phone.e164,
      templateKey: input.templateKey,
    });

    const [existing] = await db
      .select()
      .from(communicationTransactions)
      .where(
        and(
          eq(communicationTransactions.tenantId, input.tenantId),
          eq(communicationTransactions.idempotencyKey, key),
          eq(communicationTransactions.isDeleted, false),
        ),
      )
      .limit(1);
    if (existing) {
      const open = ["queued", "processing", "accepted", "sent", "delivered", "read"];
      return {
        ok: open.includes(existing.status),
        id: existing.id,
        status: existing.status,
        duplicate: true,
      };
    }

    let status: CommunicationStatus = "queued";
    let errorCategory: string | null = null;
    let errorMessage: string | null = null;

    if (input.preferenceMode === "opt_in") {
      if (!input.userId) {
        status = "cancelled";
        errorCategory = "opt_out";
        errorMessage = "opt_out";
      } else {
        const [profile] = await db
          .select({ communicationPrefsJson: residentProfiles.communicationPrefsJson })
          .from(residentProfiles)
          .where(
            and(
              eq(residentProfiles.tenantId, input.tenantId),
              eq(residentProfiles.userId, input.userId),
              eq(residentProfiles.isDeleted, false),
            ),
          )
          .limit(1);
        const prefs = parseCommunicationPreferences(profile?.communicationPrefsJson);
        if (prefs.whatsapp !== true) {
          status = "cancelled";
          errorCategory = "opt_out";
          errorMessage = "opt_out";
        }
      }
    }

    if (status === "queued") {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const [countRow] = await db
        .select({ n: sql<number>`count(*)` })
        .from(communicationTransactions)
        .where(
          and(
            eq(communicationTransactions.tenantId, input.tenantId),
            gte(communicationTransactions.createdAt, nowMysql(start)),
            eq(communicationTransactions.isDeleted, false),
            sql`${communicationTransactions.status} <> 'cancelled'`,
          ),
        );
      const count = Number(countRow?.n ?? 0);
      if (count >= config.dailySendCap) {
        status = "failed";
        errorCategory = "rate_limited";
        errorMessage = "daily_cap";
      }
    }

    const externalId = externalTemplateId(config, input.templateKey);
    if (status === "queued" && config.provider !== "stub" && !externalId) {
      status = "failed";
      errorCategory = "template_error";
      errorMessage = "missing_template_id";
    }

    const id = crypto.randomUUID();
    const reference = communicationReference();
    const now = nowMysql();
    try {
      await db.insert(communicationTransactions).values({
        id,
        tenantId: input.tenantId,
        communicationReference: reference,
        correlationId: `SH-COR-${id.slice(0, 8)}`,
        idempotencyKey: key,
        userId: input.userId ?? null,
        actorUserId: input.actorUserId ?? null,
        channel: "whatsapp",
        provider: config.provider,
        templateKey: input.templateKey,
        templateVersion: template.version,
        language: input.language ?? "en",
        recipientE164: phone.e164,
        recipientLast4: last4(phone.e164),
        status,
        businessEntityType: input.businessEntityType,
        businessEntityId: input.businessEntityId,
        businessEventType: input.businessEventType,
        preferenceMode: input.preferenceMode,
        requestedAt: now,
        failedAt: status === "failed" ? now : null,
        errorCategory,
        errorMessage,
        contentSha256: contentSha256(input.variables),
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
      });
    } catch (err) {
      if (!isDuplicateError(err)) throw err;
      const [race] = await db
        .select()
        .from(communicationTransactions)
        .where(
          and(
            eq(communicationTransactions.tenantId, input.tenantId),
            eq(communicationTransactions.idempotencyKey, key),
          ),
        )
        .limit(1);
      if (race) return { ok: true, id: race.id, status: race.status, duplicate: true };
      throw err;
    }

    if (status === "queued") pendingVariables.set(id, input.variables);
    recordActivity({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId ?? input.userId ?? id,
      action: ActivityType.COMMUNICATION_QUEUED,
      entityType: "communication",
      entityId: id,
      message: `${input.templateKey} ${maskPhone(phone.e164)} ${status}`,
      meta: { templateKey: input.templateKey, status, provider: config.provider },
    });

    return {
      ok: status === "queued",
      id,
      status,
      error: errorMessage ?? undefined,
    };
  } catch (err) {
    console.warn("[whatsapp] enqueue failed", err instanceof Error ? err.message : "error");
    return { ok: false, error: "enqueue_failed" };
  }
}

function affectedRows(result: unknown): number {
  if (Array.isArray(result)) {
    const head = result[0] as { affectedRows?: number } | undefined;
    return head?.affectedRows ?? 0;
  }
  return (result as { affectedRows?: number } | undefined)?.affectedRows ?? 0;
}

async function setStatus(
  id: string,
  from: string,
  to: CommunicationStatus,
  extra: Record<string, unknown>,
): Promise<boolean> {
  if (!canTransition(from, to)) return false;
  const result = await db
    .update(communicationTransactions)
    .set({ status: to, ...extra })
    .where(and(eq(communicationTransactions.id, id), eq(communicationTransactions.status, from)));
  return affectedRows(result) > 0;
}

export async function processDueCommunications(limit = 10): Promise<number> {
  const now = nowMysql();
  const due = await db
    .select()
    .from(communicationTransactions)
    .where(
      and(
        eq(communicationTransactions.status, "queued"),
        eq(communicationTransactions.isDeleted, false),
        or(
          isNull(communicationTransactions.nextAttemptAt),
          lte(communicationTransactions.nextAttemptAt, now),
        ),
      ),
    )
    .limit(limit);

  let processed = 0;
  for (const row of due) {
    const claimed = await db
      .update(communicationTransactions)
      .set({ status: "processing" })
      .where(
        and(eq(communicationTransactions.id, row.id), eq(communicationTransactions.status, "queued")),
      );
    if (affectedRows(claimed) === 0) continue;
    processed += 1;
    await deliverClaimed({ ...row, status: "processing" });
  }
  return processed;
}

async function deliverClaimed(row: typeof communicationTransactions.$inferSelect): Promise<void> {
  const config = await loadWhatsAppRuntime();
  const providerId = (row.provider || config.provider) as WhatsAppProviderId;
  const provider = providerFor(
    providerId === config.provider ? config : { ...config, provider: providerId },
    providerId,
  );
  const templateKey = isTemplateKey(row.templateKey) ? row.templateKey : null;
  const started = Date.now();
  const attemptId = crypto.randomUUID();
  const callbackBase = config.statusCallbackBaseUrl.replace(/\/$/, "");
  const statusCallbackUrl = callbackBase
    ? `${callbackBase}/v1/integrations/whatsapp/${providerId}/status`
    : "";

  const variables = pendingVariables.get(row.id) ?? {};
  const runtime = { ...config, provider: providerId };
  const externalId = templateKey ? externalTemplateId(runtime, templateKey) : "";
  const variablesOk = templateKey
    ? validateTemplateVariables(templateKey, variables).ok || providerId === "stub"
    : false;
  if (!templateKey || !variablesOk || (providerId !== "stub" && !externalId)) {
    await finishAttempt(row, attemptId, providerId, started, {
      ok: false,
      error: "configuration_error",
      requestSha256: contentSha256({}),
    });
    await setStatus(row.id, "processing", "failed", {
      errorCategory: externalId ? "template_error" : "configuration_error",
      errorMessage: externalId ? "missing_variables" : "missing_template_id",
      failedAt: nowMysql(),
    });
    return;
  }

  const send = await provider.send({
    toE164: row.recipientE164,
    templateKey,
    language: row.language,
    variables,
    externalTemplateId: externalId,
    statusCallbackUrl,
  });
  if (send.ok) pendingVariables.delete(row.id);
  await finishAttempt(row, attemptId, providerId, started, send);

  if (send.ok && send.providerMessageId) {
    const now = nowMysql();
    const moved = await setStatus(row.id, "processing", "accepted", {
      providerMessageId: send.providerMessageId,
      sentAt: now,
      provider: providerId,
    });
    if (moved && providerId === "stub") {
      await setStatus(row.id, "accepted", "delivered", { deliveredAt: nowMysql() });
    }
    recordActivity({
      tenantId: row.tenantId,
      actorUserId: row.actorUserId ?? row.userId ?? row.id,
      action: ActivityType.COMMUNICATION_ACCEPTED,
      entityType: "communication",
      entityId: row.id,
      message: `${row.templateKey} accepted ${maskPhone(row.recipientE164)}`,
      meta: { provider: providerId, templateKey: row.templateKey },
    });
    return;
  }

  const failure = classifySendFailure({
    httpStatus: send.httpStatus ?? null,
    providerMessageId: send.providerMessageId,
    timedOut: Boolean(send.timedOut),
  });
  if (failure.outcome === "retry" && row.retryCount < 2) {
    const next = new Date(Date.now() + backoffMs(row.retryCount));
    await setStatus(row.id, "processing", "queued", {
      retryCount: row.retryCount + 1,
      nextAttemptAt: nowMysql(next),
      errorCategory: failure.category,
      errorCode: send.error ?? null,
    });
    return;
  }
  await setStatus(row.id, "processing", "failed", {
    errorCategory: failure.category,
    errorCode: send.error ?? null,
    errorMessage: failure.category,
    failedAt: nowMysql(),
  });
  recordActivity({
    tenantId: row.tenantId,
    actorUserId: row.actorUserId ?? row.userId ?? row.id,
    action: ActivityType.COMMUNICATION_FAILED,
    entityType: "communication",
    entityId: row.id,
    message: `${row.templateKey} failed ${failure.category}`,
    meta: { category: failure.category, templateKey: row.templateKey },
  });
}

async function finishAttempt(
  row: typeof communicationTransactions.$inferSelect,
  attemptId: string,
  providerId: string,
  started: number,
  send: { ok: boolean; providerMessageId?: string; httpStatus?: number; error?: string; requestSha256: string; responseSha256?: string },
): Promise<void> {
  await db.insert(communicationAttempts).values({
    id: attemptId,
    tenantId: row.tenantId,
    communicationTransactionId: row.id,
    attemptNumber: row.retryCount + 1,
    provider: providerId,
    providerMessageId: send.providerMessageId ?? null,
    startedAt: nowMysql(new Date(started)),
    completedAt: nowMysql(),
    durationMs: Date.now() - started,
    httpStatus: send.httpStatus ?? null,
    status: send.ok ? "accepted" : "failed",
    errorCode: send.error ?? null,
    errorMessage: send.ok ? null : (send.error ?? "failed"),
    requestSha256: send.requestSha256,
    responseSha256: send.responseSha256 ?? null,
  });
}

/**
 * Variables are not persisted. The worker cannot rebuild Twilio content variables
 * from the hash alone. Persist a redacted variable payload in memory is wrong across
 * process restarts. Store non-sensitive variables in error-free column? Plan says do
 * not store rendered body or OTP variables.
 *
 * We keep a process-local map for variables between enqueue and the immediate worker
 * tick so the first attempt can render the template. After a restart, a retry without
 * the map fails as template_error instead of sending a blank WhatsApp.
 */
const pendingVariables = new Map<string, Record<string, string>>();

export async function applyProviderStatus(input: {
  provider: WhatsAppProviderId;
  update: ProviderStatusUpdate;
  payloadSha256: string;
}): Promise<"updated" | "duplicate" | "unmatched" | "ignored"> {
  const [existingEvent] = await db
    .select({ id: communicationProviderEvents.id })
    .from(communicationProviderEvents)
    .where(
      and(
        eq(communicationProviderEvents.provider, input.provider),
        eq(communicationProviderEvents.providerMessageId, input.update.providerMessageId),
        eq(communicationProviderEvents.status, input.update.status),
        eq(communicationProviderEvents.eventTimestamp, input.update.eventTimestamp),
      ),
    )
    .limit(1);
  if (existingEvent) return "duplicate";

  const [tx] = await db
    .select()
    .from(communicationTransactions)
    .where(
      and(
        eq(communicationTransactions.provider, input.provider),
        eq(communicationTransactions.providerMessageId, input.update.providerMessageId),
        eq(communicationTransactions.isDeleted, false),
      ),
    )
    .limit(1);

  const now = nowMysql();
  if (!tx) {
    await db.insert(communicationProviderEvents).values({
      id: crypto.randomUUID(),
      provider: input.provider,
      providerMessageId: input.update.providerMessageId,
      eventType: "status",
      status: input.update.status,
      eventTimestamp: input.update.eventTimestamp,
      receivedAt: now,
      processedAt: now,
      signatureValid: true,
      payloadSha256: input.payloadSha256,
      processingStatus: "unmatched",
      errorCode: input.update.errorCode ?? null,
    });
    return "unmatched";
  }

  if (tx.status === input.update.status) {
    await insertEvent(tx, input, "duplicate");
    return "duplicate";
  }
  if (!canTransition(tx.status, input.update.status)) {
    await insertEvent(tx, input, "ignored");
    return "ignored";
  }

  const stamps: Record<string, unknown> = {};
  if (input.update.status === "sent") stamps.sentAt = now;
  if (input.update.status === "delivered") stamps.deliveredAt = now;
  if (input.update.status === "read") stamps.readAt = now;
  if (input.update.status === "failed" || input.update.status === "undelivered") {
    stamps.failedAt = now;
    stamps.errorCategory = input.update.status === "undelivered" ? "undeliverable" : "delivery_failed";
    stamps.errorCode = input.update.errorCode ?? null;
  }
  const moved = await setStatus(tx.id, tx.status, input.update.status, stamps);
  await insertEvent(tx, input, moved ? "processed" : "ignored");
  if (moved && (input.update.status === "delivered" || input.update.status === "failed" || input.update.status === "undelivered")) {
    recordActivity({
      tenantId: tx.tenantId,
      actorUserId: tx.actorUserId ?? tx.userId ?? tx.id,
      action:
        input.update.status === "delivered"
          ? ActivityType.COMMUNICATION_DELIVERED
          : ActivityType.COMMUNICATION_FAILED,
      entityType: "communication",
      entityId: tx.id,
      message: `${tx.communicationReference} ${input.update.status}`,
      meta: { status: input.update.status, templateKey: tx.templateKey },
    });
  }
  return moved ? "updated" : "ignored";
}

async function insertEvent(
  tx: typeof communicationTransactions.$inferSelect,
  input: { provider: WhatsAppProviderId; update: ProviderStatusUpdate; payloadSha256: string },
  processingStatus: string,
): Promise<void> {
  try {
    await db.insert(communicationProviderEvents).values({
      id: crypto.randomUUID(),
      tenantId: tx.tenantId,
      provider: input.provider,
      providerMessageId: input.update.providerMessageId,
      eventType: "status",
      status: input.update.status,
      eventTimestamp: input.update.eventTimestamp,
      communicationTransactionId: tx.id,
      receivedAt: nowMysql(),
      processedAt: nowMysql(),
      signatureValid: true,
      payloadSha256: input.payloadSha256,
      processingStatus,
      errorCode: input.update.errorCode ?? null,
    });
  } catch (err) {
    if (!isDuplicateError(err)) throw err;
  }
}
