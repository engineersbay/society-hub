import { Elysia } from "elysia";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { CommunicationListItemDto, CommunicationTimelineDto } from "@society-hub/types";
import {
  communicationListQuerySchema,
  updateWhatsAppIntegrationSchema,
} from "@society-hub/validation";
import { ActivityType, recordAudit } from "../../lib/audit";
import { authPlugin, requireAuth, requireSocietyStaff } from "../../lib/auth-context";
import { requirePlatform } from "../../lib/auth-helpers";
import { AppError } from "../../lib/errors";
import { db } from "../../db/client";
import {
  communicationAttempts,
  communicationProviderEvents,
  communicationTransactions,
} from "../../db/schema";
import { applyProviderStatus } from "../../lib/messaging/communication-service";
import {
  loadWhatsAppRuntime,
  readWhatsAppSettingsPublic,
  saveWhatsAppSettings,
} from "../../lib/messaging/integration-config";
import { normalizePhoneE164 } from "../../lib/messaging/phone";
import {
  GupshupWhatsAppProvider,
  MetaWhatsAppProvider,
  TwilioWhatsAppProvider,
  verifyMetaHub,
} from "../../lib/messaging/providers";
import { sha256Text } from "../../lib/messaging/templates";

function masked(last4: string): string {
  return `******${last4}`;
}

function toListItem(row: typeof communicationTransactions.$inferSelect): CommunicationListItemDto {
  return {
    id: row.id,
    communicationReference: row.communicationReference,
    correlationId: row.correlationId,
    userId: row.userId,
    channel: row.channel,
    provider: row.provider,
    templateKey: row.templateKey,
    status: row.status,
    providerMessageId: row.providerMessageId,
    businessEntityType: row.businessEntityType,
    businessEntityId: row.businessEntityId,
    businessEventType: row.businessEventType,
    recipientMasked: masked(row.recipientLast4),
    errorCategory: row.errorCategory,
    requestedAt: row.requestedAt,
    createdAt: row.createdAt,
  };
}

export const whatsappSettingsRoutes = new Elysia({ prefix: "/v1/manage/integrations/whatsapp" })
  .use(authPlugin)
  .get("/", async ({ auth }) => {
    const claims = requireAuth(auth);
    requirePlatform(claims);
    void claims;
    return readWhatsAppSettingsPublic();
  })
  .patch("/", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    requirePlatform(claims);
    const parsed = updateWhatsAppIntegrationSchema.parse(body);
    let changed: string[] = [];
    try {
      const saved = await saveWhatsAppSettings(parsed, claims.sub);
      changed = saved.changed;
    } catch (err) {
      const message = err instanceof Error ? err.message : "config_error";
      if (message.includes("INTEGRATION_CONFIG_KEY")) {
        throw new AppError(400, "configuration_error", "Server encryption key is not set");
      }
      throw err;
    }
    await recordAudit({
      tenantId: claims.tenantId,
      actorUserId: claims.sub,
      action: ActivityType.WHATSAPP_SETTINGS_UPDATED,
      entityType: "platform_integration",
      entityId: claims.tenantId,
      message: `WhatsApp settings updated (${changed.join(", ") || "none"})`,
      meta: { changed },
    });
    return readWhatsAppSettingsPublic();
  });

export const communicationAdminRoutes = new Elysia({ prefix: "/v1/admin/communications" })
  .use(authPlugin)
  .get("/", async ({ auth, query }) => {
    const claims = requireAuth(auth);
    requireSocietyStaff(claims);
    const parsed = communicationListQuerySchema.parse(query ?? {});
    const filters = [
      eq(communicationTransactions.tenantId, claims.tenantId),
      eq(communicationTransactions.isDeleted, false),
    ];
    if (parsed.reference) {
      filters.push(eq(communicationTransactions.communicationReference, parsed.reference));
    }
    if (parsed.correlationId) {
      filters.push(eq(communicationTransactions.correlationId, parsed.correlationId));
    }
    if (parsed.userId) filters.push(eq(communicationTransactions.userId, parsed.userId));
    if (parsed.businessEntityId) {
      filters.push(eq(communicationTransactions.businessEntityId, parsed.businessEntityId));
    }
    if (parsed.providerMessageId) {
      filters.push(eq(communicationTransactions.providerMessageId, parsed.providerMessageId));
    }
    if (parsed.provider) filters.push(eq(communicationTransactions.provider, parsed.provider));
    if (parsed.status) filters.push(eq(communicationTransactions.status, parsed.status));
    if (parsed.templateKey) {
      filters.push(eq(communicationTransactions.templateKey, parsed.templateKey));
    }
    if (parsed.phone) {
      const normalized = normalizePhoneE164(parsed.phone);
      if (normalized.ok) {
        filters.push(eq(communicationTransactions.recipientE164, normalized.e164));
      } else if (parsed.phone.length <= 4) {
        filters.push(eq(communicationTransactions.recipientLast4, parsed.phone));
      }
    }
    if (parsed.from) filters.push(gte(communicationTransactions.createdAt, parsed.from));
    if (parsed.to) filters.push(lte(communicationTransactions.createdAt, parsed.to));

    const where = and(...filters);
    const [countRow] = await db
      .select({ n: sql<number>`count(*)` })
      .from(communicationTransactions)
      .where(where);
    const rows = await db
      .select()
      .from(communicationTransactions)
      .where(where)
      .orderBy(desc(communicationTransactions.createdAt))
      .limit(parsed.limit)
      .offset((parsed.page - 1) * parsed.limit);
    return {
      items: rows.map(toListItem),
      page: parsed.page,
      limit: parsed.limit,
      total: Number(countRow?.n ?? 0),
    };
  })
  .get("/:id", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    requireSocietyStaff(claims);
    const [row] = await db
      .select()
      .from(communicationTransactions)
      .where(
        and(
          eq(communicationTransactions.id, params.id),
          eq(communicationTransactions.tenantId, claims.tenantId),
          eq(communicationTransactions.isDeleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new AppError(404, "not_found", "Communication not found");
    const attempts = await db
      .select()
      .from(communicationAttempts)
      .where(eq(communicationAttempts.communicationTransactionId, row.id));
    const events = await db
      .select()
      .from(communicationProviderEvents)
      .where(eq(communicationProviderEvents.communicationTransactionId, row.id));
    const timeline: CommunicationTimelineDto["events"] = [
      { at: row.requestedAt, kind: "created", status: "queued", detail: row.templateKey },
      ...attempts.map((attempt) => ({
        at: attempt.startedAt,
        kind: "attempt",
        status: attempt.status,
        detail: attempt.errorCode,
      })),
      ...events.map((event) => ({
        at: event.receivedAt,
        kind: "callback",
        status: event.status,
        detail: event.processingStatus,
      })),
    ].sort((a, b) => a.at.localeCompare(b.at));
    return { ...toListItem(row), events: timeline } satisfies CommunicationTimelineDto;
  });

async function readRaw(request: Request): Promise<{ raw: string; params: Record<string, string> }> {
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw));
  return { raw, params };
}

export const whatsappWebhookRoutes = new Elysia({ prefix: "/v1/integrations/whatsapp" })
  .post("/twilio/status", async ({ request, set }) => {
    const { raw, params } = await readRaw(request);
    const config = await loadWhatsAppRuntime();
    const provider = new TwilioWhatsAppProvider({
      accountSid: config.twilio.accountSid,
      apiKeySid: config.twilio.apiKeySid,
      apiKeySecret: config.twilio.apiKeySecret,
      authToken: config.twilio.authToken,
      from: config.twilio.from,
    });
    const url = `${config.statusCallbackBaseUrl.replace(/\/$/, "")}/v1/integrations/whatsapp/twilio/status`;
    const valid = provider.verifyWebhook({
      signature: request.headers.get("x-twilio-signature"),
      url,
      rawBody: raw,
      params,
      secret: config.twilio.authToken,
    });
    if (!valid) {
      set.status = 403;
      console.warn("[whatsapp] rejected twilio callback");
      return { ok: false };
    }
    for (const update of provider.parseStatus(null, params)) {
      await applyProviderStatus({
        provider: "twilio",
        update,
        payloadSha256: sha256Text(raw),
      });
    }
    return { ok: true };
  })
  .post("/gupshup/status", async ({ request, set }) => {
    const { raw } = await readRaw(request);
    const config = await loadWhatsAppRuntime();
    const provider = new GupshupWhatsAppProvider({
      apiKey: config.gupshup.apiKey,
      source: config.gupshup.source,
      appName: config.gupshup.appName,
    });
    let body: unknown = {};
    try {
      body = JSON.parse(raw);
    } catch {
      body = {};
    }
    const valid = provider.verifyWebhook({
      signature: request.headers.get("x-gupshup-signature"),
      url: "",
      rawBody: raw,
      params: {},
      secret: config.gupshup.apiKey,
    });
    if (!valid) {
      set.status = 403;
      console.warn("[whatsapp] rejected gupshup callback");
      return { ok: false };
    }
    for (const update of provider.parseStatus(body, {})) {
      await applyProviderStatus({
        provider: "gupshup",
        update,
        payloadSha256: sha256Text(raw),
      });
    }
    return { ok: true };
  })
  .get("/meta/status", async ({ request, set }) => {
    const url = new URL(request.url);
    const config = await loadWhatsAppRuntime();
    const mode = url.searchParams.get("hub.mode") ?? "";
    const token = url.searchParams.get("hub.verify_token") ?? "";
    const challenge = url.searchParams.get("hub.challenge") ?? "";
    if (!verifyMetaHub(mode, token, config.meta.verifyToken)) {
      set.status = 403;
      return { ok: false };
    }
    return challenge;
  })
  .post("/meta/status", async ({ request, set }) => {
    const { raw } = await readRaw(request);
    const config = await loadWhatsAppRuntime();
    const provider = new MetaWhatsAppProvider({
      token: config.meta.token,
      phoneNumberId: config.meta.phoneNumberId,
      appSecret: config.meta.appSecret,
      verifyToken: config.meta.verifyToken,
    });
    const valid = provider.verifyWebhook({
      signature: request.headers.get("x-hub-signature-256"),
      url: "",
      rawBody: raw,
      params: {},
      secret: config.meta.appSecret,
    });
    if (!valid) {
      set.status = 403;
      console.warn("[whatsapp] rejected meta callback");
      return { ok: false };
    }
    let body: unknown = {};
    try {
      body = JSON.parse(raw);
    } catch {
      body = {};
    }
    for (const update of provider.parseStatus(body, {})) {
      await applyProviderStatus({
        provider: "meta",
        update,
        payloadSha256: sha256Text(raw),
      });
    }
    return { ok: true };
  });
