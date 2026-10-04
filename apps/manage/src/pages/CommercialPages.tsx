import { FormEvent, useEffect, useState } from "react";
import type {
  IntegrationHealthDto,
  PlatformAnnouncementDto,
  PlatformBillDto,
  PlatformDiscountDto,
  PlatformPlanDto,
  PlatformSubscriptionDto,
  SocietyDto,
  SupportTicketDto,
} from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth";
import { useSelectedSociety } from "../selected-society";
import { useViewAs } from "../view-as";

type SocietySettingsTab = "details" | "billing" | "access";

function parseSocietySettingsTab(value: string | null): SocietySettingsTab {
  if (value === "billing" || value === "access") return value;
  return "details";
}

const MODULES = [
  "complaints",
  "bills",
  "payments",
  "notices",
  "visitors",
  "parking",
  "bookings",
  "assets",
  "vendors",
  "events",
];

export function SubscriptionsPage() {
  const { client, user } = useAuth();
  const allowed = user?.role === "superadmin";
  const [plans, setPlans] = useState<PlatformPlanDto[]>([]);
  const [subs, setSubs] = useState<PlatformSubscriptionDto[]>([]);
  const [societies, setSocieties] = useState<SocietyDto[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [planId, setPlanId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    Promise.all([
      client.listPlatformPlans(),
      client.listPlatformSubscriptions(),
      client.listSocieties(),
    ])
      .then(([p, s, soc]) => {
        setPlans(p);
        setSubs(s);
        setSocieties(soc);
        if (!planId && p[0]) setPlanId(p[0].id);
        if (!tenantId && soc[0]) setTenantId(soc[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }
  useEffect(load, [client]);

  async function assign(e: FormEvent) {
    e.preventDefault();
    try {
      await client.assignPlatformSubscription({ tenantId, planId, cycle: "monthly" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    }
  }

  if (!allowed) return <Navigate to="/login" replace />;
  return (
    <div>
      <h1 className="font-display text-2xl">Subscriptions</h1>
      <p className="text-sm text-black/55">Assign Starter / Growth / Enterprise per society.</p>
      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
      <form className="card mt-4 flex flex-wrap gap-2 p-4" onSubmit={assign}>
        <select className="input" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
          {societies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select className="input" value={planId} onChange={(e) => setPlanId(e.target.value)}>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name} (₹{(p.monthlyFeePaise / 100).toFixed(0)}/mo)</option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit">Assign plan</button>
      </form>
      <div className="table-wrap mt-4">
        <table className="data-table">
          <thead><tr><th>Society</th><th>Plan</th><th>Status</th></tr></thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id}>
                <td>{societies.find((x) => x.id === s.tenantId)?.name ?? s.tenantId}</td>
                <td>{s.planName ?? s.planId}</td>
                <td>{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FeatureFlagsPage() {
  const { client, user } = useAuth();
  const { viewAs } = useViewAs();
  const { selectedSociety, selectedSocietyId, refreshSocieties } = useSelectedSociety();
  const allowed = user?.role === "superadmin";
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSociety) return;
    const raw = selectedSociety.featureFlagsJson;
    const list: string[] = raw ? JSON.parse(raw) : MODULES;
    const next: Record<string, boolean> = {};
    for (const m of MODULES) next[m] = list.includes(m);
    setFlags(next);
  }, [selectedSociety]);

  async function save() {
    if (!selectedSocietyId) return;
    setError(null);
    setMsg(null);
    try {
      const enabled = MODULES.filter((m) => flags[m]);
      await client.updateManageSocietySettings(selectedSocietyId, {
        featureFlagsJson: JSON.stringify(enabled),
      });
      setMsg("Flags saved");
      await refreshSocieties();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    }
  }

  if (!allowed) return <Navigate to="/login" replace />;
  if (viewAs !== "tenant") return <Navigate to="/dashboard" replace />;
  if (!selectedSocietyId) return <Navigate to="/societies" replace />;
  return (
    <div data-testid="feature-flags-page">
      <h1 className="font-display text-2xl">Feature flags</h1>
      <p className="text-sm text-black/55">
        Modules enabled for {selectedSociety?.name ?? "this society"} in the Client App.
      </p>
      <ul className="card mt-4 divide-y divide-[var(--sand)] p-2">
        {MODULES.map((m) => (
          <li key={m} className="flex items-center justify-between px-3 py-2">
            <span className="capitalize">{m}</span>
            <input
              type="checkbox"
              checked={Boolean(flags[m])}
              onChange={(e) => setFlags((f) => ({ ...f, [m]: e.target.checked }))}
            />
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-primary mt-3" onClick={save} data-testid="feature-flags-save">
        Save flags
      </button>
      {msg && <p className="mt-2 text-sm text-[var(--leaf)]">{msg}</p>}
      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}

export function SocietySettingsManagePage() {
  const { client, user } = useAuth();
  const { viewAs } = useViewAs();
  const { selectedSociety, selectedSocietyId, refreshSocieties } = useSelectedSociety();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseSocietySettingsTab(searchParams.get("tab"));
  const allowed = user?.role === "superadmin";
  const rootDomain = import.meta.env.VITE_SOCIETYHUB_ROOT_DOMAIN ?? "localhost:5173";
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [slaDays, setSlaDays] = useState(3);
  const [status, setStatus] = useState<"active" | "suspended">("active");
  const [saved, setSaved] = useState({
    name: "",
    slug: "",
    customDomain: "",
    slaDays: 3,
    status: "active" as "active" | "suspended",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setTab(next: SocietySettingsTab) {
    const params = new URLSearchParams(searchParams);
    if (next === "details") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
  }

  useEffect(() => {
    if (!selectedSociety) return;
    const next = {
      name: selectedSociety.name,
      slug: selectedSociety.slug ?? "",
      customDomain: selectedSociety.customDomain ?? "",
      slaDays: selectedSociety.slaDays ?? 3,
      status: (selectedSociety.status ?? "active") as "active" | "suspended",
    };
    setName(next.name);
    setSlug(next.slug);
    setCustomDomain(next.customDomain);
    setSlaDays(next.slaDays);
    setStatus(next.status);
    setSaved(next);
  }, [selectedSociety]);

  const dirty =
    name !== saved.name ||
    slug !== saved.slug ||
    customDomain !== saved.customDomain ||
    slaDays !== saved.slaDays ||
    status !== saved.status;

  async function save() {
    if (!selectedSocietyId || !dirty) return;
    setError(null);
    setMsg(null);
    try {
      await client.updateSociety(selectedSocietyId, {
        name,
        slug: slug || null,
        customDomain: customDomain || null,
      });
      await client.updateManageSocietySettings(selectedSocietyId, {
        slaDays,
        status,
        slug: slug || null,
        customDomain: customDomain || null,
      });
      setSaved({ name, slug, customDomain, slaDays, status });
      setMsg("Settings updated");
      await refreshSocieties();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    }
  }

  if (!allowed) return <Navigate to="/login" replace />;
  if (viewAs !== "tenant") return <Navigate to="/dashboard" replace />;
  if (!selectedSocietyId) return <Navigate to="/societies" replace />;

  return (
    <div data-testid="society-settings-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Society settings</h1>
          <p className="mt-1 text-sm text-black/55">
            View and edit society details, billing, and access — like Fassport Tenant Settings.
          </p>
        </div>
        {dirty && tab !== "billing" && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={save}
            data-testid="society-settings-save"
          >
            Update settings
          </button>
        )}
      </div>

      <div className="mt-4 flex gap-1 border-b border-[var(--sand)]">
        {(
          [
            ["details", "Details"],
            ["billing", "Billing"],
            ["access", "Access"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-testid={`society-settings-tab-${id}`}
            className={[
              "px-4 py-2 text-sm font-medium",
              tab === id
                ? "border-b-2 border-[var(--leaf)] text-[var(--leaf-dark)]"
                : "text-black/50 hover:text-[var(--leaf-dark)]",
            ].join(" ")}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      {msg && <p className="mt-3 text-sm text-[var(--leaf)]">{msg}</p>}

      {tab === "details" && (
        <div className="card mt-4 grid max-w-xl gap-4 p-5" data-testid="society-settings-details">
          <div>
            <label className="label" htmlFor="soc-detail-name">
              Name
            </label>
            <input
              id="soc-detail-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="soc-detail-domain">
              Custom domain
            </label>
            <input
              id="soc-detail-domain"
              className="input"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="app.yoursociety.com"
              data-testid="society-custom-domain"
            />
            <p className="mt-1 text-xs text-black/45">
              Residents use this host to open the Client App. If you change it, update DNS as well.
              Contact support before pointing a live production domain.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="soc-detail-slug">
              Slug
            </label>
            <input
              id="soc-detail-slug"
              className="input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              data-testid="society-slug"
              required
            />
            <p className="mt-1 text-xs text-black/45">
              Unique identifier for this society. Example:{" "}
              {(slug || "your-slug").toLowerCase()}.{rootDomain}
            </p>
          </div>
        </div>
      )}

      {tab === "billing" && (
        <div className="card mt-4 max-w-xl space-y-3 p-5" data-testid="society-settings-billing">
          <p className="font-semibold">Platform subscription</p>
          <p className="text-sm text-black/55">
            Pay or reconcile the platform fee for {selectedSociety?.name ?? "this society"}. Coupons
            and offline / Razorpay checkout live on the billing screen.
          </p>
          <Link
            className="btn btn-primary inline-flex w-fit"
            to="/society-billing"
            data-testid="society-settings-open-billing"
          >
            Open billing
          </Link>
        </div>
      )}

      {tab === "access" && (
        <div className="card mt-4 grid max-w-xl gap-4 p-5" data-testid="society-settings-access">
          <div>
            <label className="label" htmlFor="soc-detail-sla">
              Complaint SLA (days)
            </label>
            <input
              id="soc-detail-sla"
              className="input"
              type="number"
              min={1}
              value={slaDays}
              onChange={(e) => setSlaDays(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="soc-detail-status">
              Status
            </label>
            <select
              id="soc-detail-status"
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "suspended")}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export function DiscountsPage() {
  const { client, user } = useAuth();
  const allowed = user?.role === "superadmin";
  const [items, setItems] = useState<PlatformDiscountDto[]>([]);
  const [societies, setSocieties] = useState<SocietyDto[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [percentOff, setPercentOff] = useState(10);
  const [code, setCode] = useState("PILOT10");

  function load() {
    client.listPlatformDiscounts().then(setItems);
    client.listSocieties().then((s) => {
      setSocieties(s);
      if (s[0]) setTenantId(s[0].id);
    });
  }
  useEffect(load, [client]);

  async function create(e: FormEvent) {
    e.preventDefault();
    await client.createPlatformDiscount({ tenantId, percentOff, code });
    load();
  }

  if (!allowed) return <Navigate to="/login" replace />;
  return (
    <div>
      <h1 className="font-display text-2xl">Discounts</h1>
      <form className="card mt-4 flex flex-wrap gap-2 p-4" onSubmit={create}>
        <select className="input" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
          {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="input w-28" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" />
        <input className="input w-24" type="number" min={1} max={100} value={percentOff} onChange={(e) => setPercentOff(Number(e.target.value))} />
        <button className="btn btn-primary" type="submit">Add %</button>
      </form>
      <ul className="mt-4 space-y-2">
        {items.map((d) => (
          <li key={d.id} className="card px-4 py-3 text-sm">
            {d.code ?? "—"} · {d.percentOff != null ? `${d.percentOff}%` : `₹${(d.flatOffPaise ?? 0) / 100}`} · {d.tenantId ?? "all"}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlatformBillsPage() {
  const { client, user } = useAuth();
  const allowed = user?.role === "superadmin";
  const [bills, setBills] = useState<PlatformBillDto[]>([]);
  const [societies, setSocieties] = useState<SocietyDto[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [periodYm, setPeriodYm] = useState(new Date().toISOString().slice(0, 7));

  function load() {
    client.listPlatformBills().then(setBills);
    client.listSocieties().then((s) => {
      setSocieties(s);
      if (s[0]) setTenantId(s[0].id);
    });
  }
  useEffect(load, [client]);

  async function generate(e: FormEvent) {
    e.preventDefault();
    await client.generatePlatformBill({ tenantId, periodYm });
    load();
  }

  if (!allowed) return <Navigate to="/login" replace />;
  return (
    <div>
      <h1 className="font-display text-2xl">Generate bills</h1>
      <p className="text-sm text-black/55">Platform subscription invoices (offline mark paid).</p>
      <form className="card mt-4 flex flex-wrap gap-2 p-4" onSubmit={generate}>
        <select className="input" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
          {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="input" value={periodYm} onChange={(e) => setPeriodYm(e.target.value)} placeholder="YYYY-MM" />
        <button className="btn btn-primary" type="submit">Generate</button>
      </form>
      <div className="table-wrap mt-4">
        <table className="data-table">
          <thead><tr><th>Society</th><th>Period</th><th>Amount</th><th>Status</th><th /></tr></thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id}>
                <td>{b.societyName ?? b.tenantId}</td>
                <td>{b.periodYm}</td>
                <td>₹{(b.amountPaise / 100).toFixed(0)}</td>
                <td>{b.status}</td>
                <td>
                  {b.status === "issued" && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => client.markPlatformBillPaid(b.id).then(load)}>
                      Mark paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlatformPaymentsPage() {
  const { client, user } = useAuth();
  const allowed = user?.role === "superadmin";
  const [bills, setBills] = useState<PlatformBillDto[]>([]);
  const [detailRef, setDetailRef] = useState("");
  const [detail, setDetail] = useState<{
    paymentReference: string;
    status: string;
    amountPaise: number;
    method: string | null;
    timeline: Array<{ at: string; label: string }>;
  } | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    client.listPlatformBills().then(setBills);
  }, [client]);

  const paid = bills.filter((b) => b.status === "paid");
  if (!allowed) return <Navigate to="/login" replace />;

  async function loadDetail(e: FormEvent) {
    e.preventDefault();
    if (!detailRef.trim()) return;
    setDetailError(null);
    try {
      const row = await client.getPlatformPayment(detailRef.trim());
      setDetail({
        paymentReference: row.paymentReference,
        status: row.status,
        amountPaise: row.amountPaise,
        method: row.method,
        timeline: [
          { at: row.createdAt, label: `initiated (${row.status})` },
          ...(row.providerOrderId
            ? [{ at: row.createdAt, label: `order ${row.providerOrderId}` }]
            : []),
          ...(row.providerPaymentId
            ? [{ at: row.completedAt ?? row.createdAt, label: `payment ${row.providerPaymentId}` }]
            : []),
          ...(row.completedAt
            ? [{ at: row.completedAt, label: "captured / bill marked paid" }]
            : []),
          ...(row.failedAt
            ? [
                {
                  at: row.failedAt,
                  label: row.failureReason
                    ? `failed: ${row.failureReason}`
                    : "failed",
                },
              ]
            : []),
          ...row.webhooks.map((w) => ({
            at: w.receivedAt,
            label: `webhook ${w.eventType} (${w.processingStatus})`,
          })),
        ].sort((a, b) => a.at.localeCompare(b.at)),
      });
    } catch (err) {
      setDetail(null);
      setDetailError(err instanceof ApiClientError ? err.body.message : "Not found");
    }
  }

  async function reconcile() {
    if (!detailRef.trim()) return;
    try {
      const res = await client.reconcilePlatformPayment(detailRef.trim());
      setDetailError(null);
      setDetail((d) =>
        d
          ? {
              ...d,
              timeline: [
                ...d.timeline,
                { at: new Date().toISOString(), label: `reconcile: ${res.result}` },
              ],
            }
          : d,
      );
    } catch (err) {
      setDetailError(err instanceof ApiClientError ? err.body.message : "Reconcile failed");
    }
  }

  return (
    <div data-testid="platform-payments-page">
      <h1 className="font-display text-2xl">Payments</h1>
      <p className="text-sm text-black/55">
        Platform subscription payments — offline receipts and Razorpay when configured.
      </p>
      <ul className="mt-4 space-y-2">
        {paid.length === 0 ? (
          <li className="empty-state">No paid platform invoices yet.</li>
        ) : (
          paid.map((b) => (
            <li key={b.id} className="card px-4 py-3 text-sm">
              {b.societyName} · {b.periodYm} · ₹{(b.amountPaise / 100).toFixed(0)} · paid
            </li>
          ))
        )}
      </ul>

      <form className="card mt-6 flex flex-wrap gap-2 p-4" onSubmit={loadDetail}>
        <input
          className="input max-w-md flex-1"
          placeholder="Payment reference SH-PAY-…"
          value={detailRef}
          onChange={(e) => setDetailRef(e.target.value)}
          data-testid="payment-ref-input"
        />
        <button className="btn btn-primary" type="submit">
          Open timeline
        </button>
        <button className="btn btn-ghost" type="button" onClick={reconcile} disabled={!detailRef.trim()}>
          Reconcile
        </button>
      </form>
      {detailError && <p className="mt-2 text-sm text-[var(--danger)]">{detailError}</p>}
      {detail && (
        <div className="card mt-3 p-4" data-testid="payment-timeline">
          <p className="font-medium">
            {detail.paymentReference} · ₹{(detail.amountPaise / 100).toFixed(0)} · {detail.status}
            {detail.method ? ` · ${detail.method}` : ""}
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-black/70">
            {detail.timeline.map((t, i) => (
              <li key={`${t.at}-${i}`}>
                {t.label} <span className="text-black/40">({t.at})</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function AnnouncementsPage() {
  const { client, user } = useAuth();
  const allowed = user?.role === "superadmin";
  const [items, setItems] = useState<PlatformAnnouncementDto[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function load() {
    client.listPlatformAnnouncements().then(setItems);
  }
  useEffect(load, [client]);

  async function publish(e: FormEvent) {
    e.preventDefault();
    await client.createPlatformAnnouncement({ title, body, audience: "all", publishNow: true });
    setTitle("");
    setBody("");
    load();
  }

  if (!allowed) return <Navigate to="/login" replace />;
  return (
    <div>
      <h1 className="font-display text-2xl">Announcements</h1>
      <form className="card mt-4 grid gap-2 p-4" onSubmit={publish}>
        <input className="input" required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" required rows={3} placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn btn-primary" type="submit">Publish to all society staff</button>
      </form>
      <ul className="mt-4 space-y-2">
        {items.map((a) => (
          <li key={a.id} className="card px-4 py-3">
            <p className="font-medium">{a.title}</p>
            <p className="text-sm text-black/55">{a.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const WHATSAPP_TEMPLATE_KEYS = [
  "visitor_pass_v1",
  "resident_invite_v1",
  "onboard_welcome_v1",
  "complaint_staff_v1",
  "payment_credited_v1",
  "payment_rejected_v1",
  "bill_ready_v1",
] as const;

type WhatsAppProviderChoice = "stub" | "twilio" | "gupshup" | "meta";

function emptyTemplateMap(): Record<string, string> {
  return Object.fromEntries(WHATSAPP_TEMPLATE_KEYS.map((key) => [key, ""]));
}

function secretPlaceholder(set: boolean, label: string): string {
  return set ? `${label} is set — enter a new one to replace` : label;
}

export function IntegrationsPage() {
  const { client, user } = useAuth();
  const allowed = user?.role === "superadmin";
  const [health, setHealth] = useState<IntegrationHealthDto | null>(null);
  const [provider, setProvider] = useState<WhatsAppProviderChoice>("stub");
  const [dailySendCap, setDailySendCap] = useState("200");
  const [statusCallbackBaseUrl, setStatusCallbackBaseUrl] = useState("");
  const [accountSid, setAccountSid] = useState("");
  const [apiKeySid, setApiKeySid] = useState("");
  const [apiKeySecret, setApiKeySecret] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [whatsappFrom, setWhatsappFrom] = useState("");
  const [twilioContentSids, setTwilioContentSids] = useState(emptyTemplateMap);
  const [secretSet, setSecretSet] = useState(false);
  const [tokenSet, setTokenSet] = useState(false);
  const [gupshupSource, setGupshupSource] = useState("");
  const [gupshupAppName, setGupshupAppName] = useState("");
  const [gupshupApiKey, setGupshupApiKey] = useState("");
  const [gupshupApiKeySet, setGupshupApiKeySet] = useState(false);
  const [gupshupTemplateIds, setGupshupTemplateIds] = useState(emptyTemplateMap);
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [metaVerifyToken, setMetaVerifyToken] = useState("");
  const [metaTokenSet, setMetaTokenSet] = useState(false);
  const [metaAppSecretSet, setMetaAppSecretSet] = useState(false);
  const [metaVerifyTokenSet, setMetaVerifyTokenSet] = useState(false);
  const [metaTemplateNames, setMetaTemplateNames] = useState(emptyTemplateMap);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    client.getIntegrationsHealth().then(setHealth);
    client
      .getWhatsAppIntegration()
      .then((settings) => {
        setProvider(settings.provider);
        setDailySendCap(String(settings.dailySendCap));
        setStatusCallbackBaseUrl(settings.statusCallbackBaseUrl ?? "");
        setAccountSid(settings.twilio.accountSid);
        setApiKeySid(settings.twilio.apiKeySid);
        setWhatsappFrom(settings.twilio.whatsappFrom);
        setTwilioContentSids({ ...emptyTemplateMap(), ...settings.twilio.contentSids });
        setSecretSet(settings.twilio.apiKeySecretSet);
        setTokenSet(settings.twilio.authTokenSet);
        setGupshupSource(settings.gupshup.source);
        setGupshupAppName(settings.gupshup.appName);
        setGupshupApiKeySet(settings.gupshup.apiKeySet);
        setGupshupTemplateIds({ ...emptyTemplateMap(), ...settings.gupshup.templateIds });
        setMetaPhoneNumberId(settings.meta.phoneNumberId);
        setMetaTokenSet(settings.meta.tokenSet);
        setMetaAppSecretSet(settings.meta.appSecretSet);
        setMetaVerifyTokenSet(settings.meta.verifyTokenSet);
        setMetaTemplateNames({ ...emptyTemplateMap(), ...settings.meta.templateNames });
      })
      .catch(() => undefined);
  }, [client]);

  function trimMap(map: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(map)
        .map(([key, value]) => [key, value.trim()] as const)
        .filter(([, value]) => value.length > 0),
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const cap = Number(dailySendCap);
      const saved = await client.updateWhatsAppIntegration({
        provider,
        dailySendCap: Number.isFinite(cap) && cap > 0 ? Math.floor(cap) : 200,
        statusCallbackBaseUrl: statusCallbackBaseUrl.trim() || null,
        twilio: {
          accountSid: accountSid.trim() || null,
          apiKeySid: apiKeySid.trim() || null,
          whatsappFrom: whatsappFrom.trim() || null,
          contentSids: trimMap(twilioContentSids),
          ...(apiKeySecret.trim() ? { apiKeySecret: apiKeySecret.trim() } : {}),
          ...(authToken.trim() ? { authToken: authToken.trim() } : {}),
        },
        gupshup: {
          source: gupshupSource.trim() || null,
          appName: gupshupAppName.trim() || null,
          templateIds: trimMap(gupshupTemplateIds),
          ...(gupshupApiKey.trim() ? { apiKey: gupshupApiKey.trim() } : {}),
        },
        meta: {
          phoneNumberId: metaPhoneNumberId.trim() || null,
          templateNames: trimMap(metaTemplateNames),
          ...(metaToken.trim() ? { token: metaToken.trim() } : {}),
          ...(metaAppSecret.trim() ? { appSecret: metaAppSecret.trim() } : {}),
          ...(metaVerifyToken.trim() ? { verifyToken: metaVerifyToken.trim() } : {}),
        },
      });
      setApiKeySecret("");
      setAuthToken("");
      setGupshupApiKey("");
      setMetaToken("");
      setMetaAppSecret("");
      setMetaVerifyToken("");
      setSecretSet(saved.twilio.apiKeySecretSet);
      setTokenSet(saved.twilio.authTokenSet);
      setGupshupApiKeySet(saved.gupshup.apiKeySet);
      setMetaTokenSet(saved.meta.tokenSet);
      setMetaAppSecretSet(saved.meta.appSecretSet);
      setMetaVerifyTokenSet(saved.meta.verifyTokenSet);
      setDailySendCap(String(saved.dailySendCap));
      setStatusCallbackBaseUrl(saved.statusCallbackBaseUrl ?? "");
      setMessage("Saved. Secrets are encrypted and are not shown again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save WhatsApp settings");
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) return <Navigate to="/login" replace />;
  return (
    <div data-testid="manage-integrations-page">
      <h1 className="font-display text-2xl">Integrations</h1>
      <p className="text-sm text-black/55">
        Set WhatsApp provider credentials here. Secrets are encrypted on the server and never returned.
      </p>
      {health && (
        <ul className="card mt-4 divide-y divide-[var(--sand)]">
          {[
            ["MSG91 OTP", health.otpConfigured],
            ["Resend email", health.emailConfigured],
            ["Local file storage", health.storageLocal],
            ["Razorpay webhook secret", health.razorpayWebhookConfigured],
            ["Google SSO", health.googleSsoConfigured],
          ].map(([label, ok]) => (
            <li key={String(label)} className="flex justify-between px-4 py-3 text-sm">
              <span>{label}</span>
              <span className={ok ? "text-[var(--leaf)]" : "text-black/40"}>
                {ok ? "Configured" : "Not set"}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form className="mt-4 grid max-w-2xl gap-4" onSubmit={save}>
        <section className="card grid gap-2 p-4">
          <h2 className="font-medium">WhatsApp provider</h2>
          <label className="text-sm">
            Active provider
            <select
              className="input mt-1"
              value={provider}
              onChange={(event) => setProvider(event.target.value as WhatsAppProviderChoice)}
            >
              <option value="stub">Stub (no paid send)</option>
              <option value="twilio">Twilio</option>
              <option value="gupshup">Gupshup</option>
              <option value="meta">WhatsApp Business API (Meta)</option>
            </select>
          </label>
          <label className="text-sm">
            Daily send cap (per society)
            <input
              className="input mt-1"
              type="number"
              min={1}
              value={dailySendCap}
              onChange={(event) => setDailySendCap(event.target.value)}
            />
          </label>
          <label className="text-sm">
            Status callback base URL
            <input
              className="input mt-1"
              placeholder="https://api.example.com"
              value={statusCallbackBaseUrl}
              onChange={(event) => setStatusCallbackBaseUrl(event.target.value)}
            />
          </label>
        </section>

        <section className="card grid gap-2 p-4">
          <h2 className="font-medium">Twilio</h2>
          <p className="text-sm text-black/55">
            Account SID, API key SID, API key secret (sends), Auth Token (webhook signatures),
            WhatsApp sender, and Content SIDs.
          </p>
          <input
            className="input"
            placeholder="Account SID (AC…)"
            value={accountSid}
            onChange={(event) => setAccountSid(event.target.value)}
          />
          <input
            className="input"
            placeholder="API Key SID (SK…)"
            value={apiKeySid}
            onChange={(event) => setApiKeySid(event.target.value)}
          />
          <input
            className="input"
            placeholder="WhatsApp sender (whatsapp:+E.164)"
            value={whatsappFrom}
            onChange={(event) => setWhatsappFrom(event.target.value)}
          />
          <input
            className="input"
            type="password"
            autoComplete="off"
            placeholder={secretPlaceholder(secretSet, "API key secret")}
            value={apiKeySecret}
            onChange={(event) => setApiKeySecret(event.target.value)}
          />
          <input
            className="input"
            type="password"
            autoComplete="off"
            placeholder={secretPlaceholder(tokenSet, "Auth token")}
            value={authToken}
            onChange={(event) => setAuthToken(event.target.value)}
          />
          <p className="mt-1 text-sm font-medium">Content SIDs</p>
          {WHATSAPP_TEMPLATE_KEYS.map((key) => (
            <label key={`twilio-${key}`} className="text-sm">
              {key}
              <input
                className="input mt-1"
                placeholder="HX…"
                value={twilioContentSids[key] ?? ""}
                onChange={(event) =>
                  setTwilioContentSids((prev) => ({ ...prev, [key]: event.target.value }))
                }
              />
            </label>
          ))}
        </section>

        <section className="card grid gap-2 p-4">
          <h2 className="font-medium">Gupshup</h2>
          <input
            className="input"
            placeholder="Source number"
            value={gupshupSource}
            onChange={(event) => setGupshupSource(event.target.value)}
          />
          <input
            className="input"
            placeholder="App name"
            value={gupshupAppName}
            onChange={(event) => setGupshupAppName(event.target.value)}
          />
          <input
            className="input"
            type="password"
            autoComplete="off"
            placeholder={secretPlaceholder(gupshupApiKeySet, "API key")}
            value={gupshupApiKey}
            onChange={(event) => setGupshupApiKey(event.target.value)}
          />
          <p className="mt-1 text-sm font-medium">Template ids</p>
          {WHATSAPP_TEMPLATE_KEYS.map((key) => (
            <label key={`gupshup-${key}`} className="text-sm">
              {key}
              <input
                className="input mt-1"
                value={gupshupTemplateIds[key] ?? ""}
                onChange={(event) =>
                  setGupshupTemplateIds((prev) => ({ ...prev, [key]: event.target.value }))
                }
              />
            </label>
          ))}
        </section>

        <section className="card grid gap-2 p-4">
          <h2 className="font-medium">Meta WhatsApp Business API</h2>
          <input
            className="input"
            placeholder="Phone number id"
            value={metaPhoneNumberId}
            onChange={(event) => setMetaPhoneNumberId(event.target.value)}
          />
          <input
            className="input"
            type="password"
            autoComplete="off"
            placeholder={secretPlaceholder(metaTokenSet, "Access token")}
            value={metaToken}
            onChange={(event) => setMetaToken(event.target.value)}
          />
          <input
            className="input"
            type="password"
            autoComplete="off"
            placeholder={secretPlaceholder(metaAppSecretSet, "App secret")}
            value={metaAppSecret}
            onChange={(event) => setMetaAppSecret(event.target.value)}
          />
          <input
            className="input"
            type="password"
            autoComplete="off"
            placeholder={secretPlaceholder(metaVerifyTokenSet, "Webhook verify token")}
            value={metaVerifyToken}
            onChange={(event) => setMetaVerifyToken(event.target.value)}
          />
          <p className="mt-1 text-sm font-medium">Template names</p>
          {WHATSAPP_TEMPLATE_KEYS.map((key) => (
            <label key={`meta-${key}`} className="text-sm">
              {key}
              <input
                className="input mt-1"
                value={metaTemplateNames[key] ?? ""}
                onChange={(event) =>
                  setMetaTemplateNames((prev) => ({ ...prev, [key]: event.target.value }))
                }
              />
            </label>
          ))}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save WhatsApp settings"}
          </button>
          {message && <p className="text-sm text-[var(--leaf)]">{message}</p>}
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </div>
      </form>
    </div>
  );
}

export function SupportInboxPage() {
  const { client, user } = useAuth();
  const allowed = user?.role === "superadmin";
  const [tickets, setTickets] = useState<SupportTicketDto[]>([]);
  const [reply, setReply] = useState<Record<string, string>>({});

  function load() {
    client.listManageSupportTickets().then(setTickets);
  }
  useEffect(load, [client]);

  async function send(id: string) {
    await client.replySupportTicket(id, { reply: reply[id] ?? "", close: true });
    load();
  }

  if (!allowed) return <Navigate to="/login" replace />;
  return (
    <div>
      <h1 className="font-display text-2xl">Support</h1>
      <p className="text-sm text-black/55">Tickets from society staff.</p>
      <ul className="mt-4 space-y-3">
        {tickets.length === 0 ? (
          <li className="empty-state">No tickets.</li>
        ) : (
          tickets.map((t) => (
            <li key={t.id} className="card p-4">
              <p className="font-medium">{t.subject} · {t.status}</p>
              <p className="text-sm text-black/55">{t.societyName} — {t.body}</p>
              {t.reply && <p className="mt-1 text-sm">Reply: {t.reply}</p>}
              {t.status === "open" && (
                <div className="mt-2 flex gap-2">
                  <input className="input" value={reply[t.id] ?? ""} onChange={(e) => setReply((r) => ({ ...r, [t.id]: e.target.value }))} placeholder="Reply" />
                  <button type="button" className="btn btn-primary" onClick={() => send(t.id)}>Close with reply</button>
                </div>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
