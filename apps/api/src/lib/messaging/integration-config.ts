import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { platformIntegrationConfig } from "../../db/schema";
import { decryptSecret, encryptSecret, integrationConfigKey } from "./secrets";
import type { WhatsAppProviderId } from "./providers";
import type { TemplateKey } from "./templates";

export const PLATFORM_INTEGRATION_ID = "00000000-0000-4000-8000-000000000001";

export type WhatsAppRuntimeConfig = {
  provider: WhatsAppProviderId;
  dailySendCap: number;
  statusCallbackBaseUrl: string;
  twilio: {
    accountSid: string;
    apiKeySid: string;
    apiKeySecret: string;
    authToken: string;
    from: string;
    contentSids: Partial<Record<TemplateKey, string>>;
  };
  gupshup: {
    apiKey: string;
    source: string;
    appName: string;
    templateIds: Partial<Record<TemplateKey, string>>;
  };
  meta: {
    token: string;
    phoneNumberId: string;
    appSecret: string;
    verifyToken: string;
    templateNames: Partial<Record<TemplateKey, string>>;
  };
};

const PROVIDERS = new Set<WhatsAppProviderId>(["stub", "twilio", "gupshup", "meta"]);

export function isWhatsAppProviderId(value: string): value is WhatsAppProviderId {
  return PROVIDERS.has(value as WhatsAppProviderId);
}

function parseJsonMap(raw: string | null | undefined): Partial<Record<TemplateKey, string>> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed;
  } catch {
    return {};
  }
}

function safeDecrypt(stored: string | null | undefined): string {
  if (!stored) return "";
  try {
    return decryptSecret(stored);
  } catch {
    return "";
  }
}

function envOr(dbValue: string | null | undefined, envName: string): string {
  const fromDb = dbValue?.trim() ?? "";
  if (fromDb) return fromDb;
  return process.env[envName]?.trim() ?? "";
}

export async function loadWhatsAppRuntime(): Promise<WhatsAppRuntimeConfig> {
  const [row] = await db
    .select()
    .from(platformIntegrationConfig)
    .where(eq(platformIntegrationConfig.id, PLATFORM_INTEGRATION_ID))
    .limit(1);

  const providerRaw = row?.whatsappProvider || process.env.WHATSAPP_PROVIDER || "stub";
  const provider = isWhatsAppProviderId(providerRaw) ? providerRaw : "stub";
  const contentSids = {
    ...parseJsonMap(process.env.TWILIO_CONTENT_SIDS_JSON),
    ...parseJsonMap(row?.twilioContentSidsJson),
  };
  const gupshupTemplates = {
    ...parseJsonMap(process.env.GUPSHUP_TEMPLATE_IDS_JSON),
    ...parseJsonMap(row?.gupshupTemplateIdsJson),
  };
  const metaTemplates = {
    ...parseJsonMap(process.env.META_TEMPLATE_NAMES_JSON),
    ...parseJsonMap(row?.metaTemplateNamesJson),
  };

  return {
    provider,
    dailySendCap: row?.dailySendCap ?? 200,
    statusCallbackBaseUrl:
      row?.statusCallbackBaseUrl?.trim() ||
      process.env.PUBLIC_API_URL?.trim() ||
      "",
    twilio: {
      accountSid: envOr(row?.twilioAccountSid, "TWILIO_ACCOUNT_SID"),
      apiKeySid: envOr(row?.twilioApiKeySid, "TWILIO_API_KEY_SID"),
      apiKeySecret: safeDecrypt(row?.twilioApiKeySecretEnc) || process.env.TWILIO_API_KEY_SECRET || "",
      authToken: safeDecrypt(row?.twilioAuthTokenEnc) || process.env.TWILIO_AUTH_TOKEN || "",
      from: envOr(row?.twilioWhatsappFrom, "TWILIO_WHATSAPP_FROM"),
      contentSids,
    },
    gupshup: {
      apiKey: safeDecrypt(row?.gupshupApiKeyEnc) || process.env.GUPSHUP_API_KEY || "",
      source: envOr(row?.gupshupSource, "GUPSHUP_SOURCE"),
      appName: envOr(row?.gupshupAppName, "GUPSHUP_APP_NAME"),
      templateIds: gupshupTemplates,
    },
    meta: {
      token: safeDecrypt(row?.metaTokenEnc) || process.env.META_WHATSAPP_TOKEN || "",
      phoneNumberId: envOr(row?.metaPhoneNumberId, "META_WHATSAPP_PHONE_NUMBER_ID"),
      appSecret: safeDecrypt(row?.metaAppSecretEnc) || process.env.META_APP_SECRET || "",
      verifyToken: safeDecrypt(row?.metaVerifyTokenEnc) || process.env.META_WHATSAPP_VERIFY_TOKEN || "",
      templateNames: metaTemplates,
    },
  };
}

export type WhatsAppSettingsPublic = {
  provider: WhatsAppProviderId;
  dailySendCap: number;
  statusCallbackBaseUrl: string;
  twilio: {
    accountSid: string;
    apiKeySid: string;
    whatsappFrom: string;
    apiKeySecretSet: boolean;
    authTokenSet: boolean;
    contentSids: Partial<Record<TemplateKey, string>>;
  };
  gupshup: {
    source: string;
    appName: string;
    apiKeySet: boolean;
    templateIds: Partial<Record<TemplateKey, string>>;
  };
  meta: {
    phoneNumberId: string;
    tokenSet: boolean;
    appSecretSet: boolean;
    verifyTokenSet: boolean;
    templateNames: Partial<Record<TemplateKey, string>>;
  };
};

export async function readWhatsAppSettingsPublic(): Promise<WhatsAppSettingsPublic> {
  const [row] = await db
    .select()
    .from(platformIntegrationConfig)
    .where(eq(platformIntegrationConfig.id, PLATFORM_INTEGRATION_ID))
    .limit(1);
  const runtime = await loadWhatsAppRuntime();
  return {
    provider: runtime.provider,
    dailySendCap: runtime.dailySendCap,
    statusCallbackBaseUrl: runtime.statusCallbackBaseUrl,
    twilio: {
      accountSid: row?.twilioAccountSid ?? "",
      apiKeySid: row?.twilioApiKeySid ?? "",
      whatsappFrom: row?.twilioWhatsappFrom ?? "",
      apiKeySecretSet: Boolean(row?.twilioApiKeySecretEnc),
      authTokenSet: Boolean(row?.twilioAuthTokenEnc),
      contentSids: parseJsonMap(row?.twilioContentSidsJson),
    },
    gupshup: {
      source: row?.gupshupSource ?? "",
      appName: row?.gupshupAppName ?? "",
      apiKeySet: Boolean(row?.gupshupApiKeyEnc),
      templateIds: parseJsonMap(row?.gupshupTemplateIdsJson),
    },
    meta: {
      phoneNumberId: row?.metaPhoneNumberId ?? "",
      tokenSet: Boolean(row?.metaTokenEnc),
      appSecretSet: Boolean(row?.metaAppSecretEnc),
      verifyTokenSet: Boolean(row?.metaVerifyTokenEnc),
      templateNames: parseJsonMap(row?.metaTemplateNamesJson),
    },
  };
}

export type WhatsAppSettingsPatch = {
  provider?: WhatsAppProviderId;
  dailySendCap?: number;
  statusCallbackBaseUrl?: string | null;
  twilio?: {
    accountSid?: string | null;
    apiKeySid?: string | null;
    apiKeySecret?: string | null;
    authToken?: string | null;
    whatsappFrom?: string | null;
    contentSids?: Partial<Record<TemplateKey, string>>;
  };
  gupshup?: {
    source?: string | null;
    appName?: string | null;
    apiKey?: string | null;
    templateIds?: Partial<Record<TemplateKey, string>>;
  };
  meta?: {
    phoneNumberId?: string | null;
    token?: string | null;
    appSecret?: string | null;
    verifyToken?: string | null;
    templateNames?: Partial<Record<TemplateKey, string>>;
  };
};

function blankToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function saveWhatsAppSettings(
  patch: WhatsAppSettingsPatch,
  actorUserId: string,
): Promise<{ changed: string[] }> {
  const changed: string[] = [];
  const [existing] = await db
    .select()
    .from(platformIntegrationConfig)
    .where(eq(platformIntegrationConfig.id, PLATFORM_INTEGRATION_ID))
    .limit(1);

  const secret = (value: string | null | undefined, field: string): string | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null || value.trim() === "") return undefined;
    if (!integrationConfigKey()) {
      throw new Error("INTEGRATION_CONFIG_KEY is required to store secrets");
    }
    changed.push(field);
    return encryptSecret(value.trim());
  };

  const values: Record<string, unknown> = {
    updatedBy: actorUserId,
  };
  if (patch.provider) {
    values.whatsappProvider = patch.provider;
    changed.push("provider");
  }
  if (patch.dailySendCap !== undefined) {
    values.dailySendCap = patch.dailySendCap;
    changed.push("dailySendCap");
  }
  if (patch.statusCallbackBaseUrl !== undefined) {
    values.statusCallbackBaseUrl = blankToNull(patch.statusCallbackBaseUrl);
    changed.push("statusCallbackBaseUrl");
  }
  if (patch.twilio?.accountSid !== undefined) {
    values.twilioAccountSid = blankToNull(patch.twilio.accountSid);
    changed.push("twilio.accountSid");
  }
  if (patch.twilio?.apiKeySid !== undefined) {
    values.twilioApiKeySid = blankToNull(patch.twilio.apiKeySid);
    changed.push("twilio.apiKeySid");
  }
  if (patch.twilio?.whatsappFrom !== undefined) {
    values.twilioWhatsappFrom = blankToNull(patch.twilio.whatsappFrom);
    changed.push("twilio.whatsappFrom");
  }
  if (patch.twilio?.contentSids) {
    values.twilioContentSidsJson = JSON.stringify(patch.twilio.contentSids);
    changed.push("twilio.contentSids");
  }
  const apiKeySecret = secret(patch.twilio?.apiKeySecret, "twilio.apiKeySecret");
  if (apiKeySecret) values.twilioApiKeySecretEnc = apiKeySecret;
  const authToken = secret(patch.twilio?.authToken, "twilio.authToken");
  if (authToken) values.twilioAuthTokenEnc = authToken;

  if (patch.gupshup?.source !== undefined) {
    values.gupshupSource = blankToNull(patch.gupshup.source);
    changed.push("gupshup.source");
  }
  if (patch.gupshup?.appName !== undefined) {
    values.gupshupAppName = blankToNull(patch.gupshup.appName);
    changed.push("gupshup.appName");
  }
  if (patch.gupshup?.templateIds) {
    values.gupshupTemplateIdsJson = JSON.stringify(patch.gupshup.templateIds);
    changed.push("gupshup.templateIds");
  }
  const gupshupKey = secret(patch.gupshup?.apiKey, "gupshup.apiKey");
  if (gupshupKey) values.gupshupApiKeyEnc = gupshupKey;

  if (patch.meta?.phoneNumberId !== undefined) {
    values.metaPhoneNumberId = blankToNull(patch.meta.phoneNumberId);
    changed.push("meta.phoneNumberId");
  }
  if (patch.meta?.templateNames) {
    values.metaTemplateNamesJson = JSON.stringify(patch.meta.templateNames);
    changed.push("meta.templateNames");
  }
  const metaToken = secret(patch.meta?.token, "meta.token");
  if (metaToken) values.metaTokenEnc = metaToken;
  const metaApp = secret(patch.meta?.appSecret, "meta.appSecret");
  if (metaApp) values.metaAppSecretEnc = metaApp;
  const metaVerify = secret(patch.meta?.verifyToken, "meta.verifyToken");
  if (metaVerify) values.metaVerifyTokenEnc = metaVerify;

  if (existing) {
    await db
      .update(platformIntegrationConfig)
      .set(values)
      .where(eq(platformIntegrationConfig.id, PLATFORM_INTEGRATION_ID));
  } else {
    await db.insert(platformIntegrationConfig).values({
      id: PLATFORM_INTEGRATION_ID,
      whatsappProvider: patch.provider ?? "stub",
      createdBy: actorUserId,
      ...values,
    });
  }
  return { changed };
}
