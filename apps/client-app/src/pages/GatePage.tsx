import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import type { FlatDto, GatePassPreviewDto, VisitorDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { useAppMode } from "../app-mode";

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export function GatePage() {
  const { client } = useAuth();
  const { mode } = useAppMode();
  const [tokenOrQr, setTokenOrQr] = useState("");
  const [otp, setOtp] = useState("");
  const [preview, setPreview] = useState<GatePassPreviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [onsite, setOnsite] = useState<VisitorDto[] | null>(null);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [flats, setFlats] = useState<FlatDto[]>([]);
  const [walkIn, setWalkIn] = useState({
    visitorName: "",
    phone: "",
    flatId: "",
    purpose: "Walk-in",
  });

  function loadOnsite() {
    client
      .listVisitors(1, 50)
      .then((page) =>
        setOnsite(page.items.filter((v) => v.checkedInAt && !v.checkedOutAt)),
      )
      .catch(() => setOnsite([]));
  }

  useEffect(() => {
    if (mode !== "admin") return;
    loadOnsite();
    client.listFlats().then(setFlats).catch(() => setFlats([]));
  }, [client, mode]);

  if (mode !== "admin") {
    return <Navigate to="/visitors" replace />;
  }

  async function runPreview(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setPreview(null);
    const raw = tokenOrQr.trim();
    if (!raw) {
      setError("Paste a pass token or QR payload");
      return;
    }
    setBusy(true);
    try {
      let passToken = raw;
      if (raw.startsWith("shv1.")) {
        const parts = raw.split(".");
        passToken = parts[2] ?? "";
      }
      if (!isUuid(passToken)) {
        setError("Could not read pass token from input");
        return;
      }
      const p = await client.previewGatePass(passToken);
      setPreview(p);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEntry() {
    setError(null);
    setBusy(true);
    try {
      const raw = tokenOrQr.trim();
      const body =
        raw.startsWith("shv1.")
          ? { qrPayload: raw, otp: otp.trim() || undefined }
          : { passToken: raw, otp: otp.trim() || undefined };
      await client.verifyGatePass(body);
      setTokenOrQr("");
      setOtp("");
      setPreview(null);
      loadOnsite();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Verify failed");
    } finally {
      setBusy(false);
    }
  }

  async function registerWalkIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!walkIn.flatId) throw new Error("Select a flat");
      const visitor = await client.createVisitor({
        visitorName: walkIn.visitorName.trim(),
        phone: walkIn.phone.trim() || null,
        purpose: walkIn.purpose.trim() || "Walk-in",
        flatId: walkIn.flatId,
      });
      if (!walkIn.phone.trim()) {
        await client.checkInVisitor(visitor.id);
        setWalkIn({ visitorName: "", phone: "", flatId: walkIn.flatId, purpose: "Walk-in" });
        loadOnsite();
        return;
      }
      const issued = await client.issueVisitorPass(visitor.id);
      setTokenOrQr(issued.qrPayload);
      setOtp(issued.otp);
      setPreview({
        passToken: issued.visitor.passToken!,
        visitorName: issued.visitor.visitorName,
        flatNumber: issued.visitor.flatNumber,
        purpose: issued.visitor.purpose,
        expiresAt: issued.expiresAt,
        passStatus: issued.visitor.passStatus,
        phone: issued.visitor.phone,
      });
      setWalkIn({ visitorName: "", phone: "", flatId: walkIn.flatId, purpose: "Walk-in" });
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.body.message
          : err instanceof Error
            ? err.message
            : "Walk-in failed",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setScanHint(null);
    setError(null);
    try {
      const Detector = (
        window as unknown as {
          BarcodeDetector?: new (o: { formats: string[] }) => {
            detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
          };
        }
      ).BarcodeDetector;
      if (!Detector) {
        setScanHint("This browser cannot decode QR from files. Paste the token or QR text instead.");
        return;
      }
      const detector = new Detector({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);
      bitmap.close();
      const value = codes[0]?.rawValue?.trim();
      if (!value) {
        setError("No QR code found in image");
        return;
      }
      setTokenOrQr(value);
      setScanHint("QR loaded — preview, then confirm entry.");
    } catch {
      setError("Could not read QR from file");
    }
  }

  return (
    <div data-testid="gate-page">
      <div className="mb-4">
        <h1 className="font-display text-xl sm:text-2xl">Gate</h1>
        <p className="mt-0.5 text-sm text-black/55">
          Verify a shared pass, or register a walk-in and confirm entry.
        </p>
      </div>

      <form className="card sh-section mb-4 grid gap-2.5 max-w-xl sm:grid-cols-2" onSubmit={registerWalkIn}>
        <h2 className="sm:col-span-2 font-medium">Walk-in</h2>
        <div>
          <label className="label">Visitor name</label>
          <input
            className="input"
            required
            value={walkIn.visitorName}
            onChange={(e) => setWalkIn((w) => ({ ...w, visitorName: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Phone (for digital pass)</label>
          <input
            className="input"
            value={walkIn.phone}
            onChange={(e) => setWalkIn((w) => ({ ...w, phone: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Flat</label>
          <select
            className="input"
            required
            value={walkIn.flatId}
            onChange={(e) => setWalkIn((w) => ({ ...w, flatId: e.target.value }))}
          >
            <option value="">Select flat</option>
            {flats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.wingName ? `${f.wingName} · ` : ""}
                {f.number}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Purpose</label>
          <input
            className="input"
            value={walkIn.purpose}
            onChange={(e) => setWalkIn((w) => ({ ...w, purpose: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {walkIn.phone.trim() ? "Register & issue pass" : "Register & check in"}
          </button>
        </div>
      </form>

      <form className="card sh-section mb-4 grid gap-2.5 max-w-xl" onSubmit={runPreview}>
        <h2 className="font-medium">Verify pass</h2>
        <div>
          <label className="label">Pass token or QR payload</label>
          <input
            className="input font-mono text-sm"
            value={tokenOrQr}
            onChange={(e) => setTokenOrQr(e.target.value)}
            placeholder="UUID or shv1.…"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="label">OTP (if required)</label>
          <input
            className="input"
            inputMode="numeric"
            maxLength={8}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
          />
        </div>
        <div>
          <label className="label">Or upload QR image</label>
          <input
            className="input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {scanHint && <p className="text-sm text-black/55">{scanHint}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" type="submit" disabled={busy}>
            Preview
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={busy || !preview}
            onClick={() => void confirmEntry()}
          >
            Confirm entry
          </button>
        </div>
      </form>

      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}

      {preview && (
        <div className="card sh-section mb-6 max-w-xl" data-testid="gate-preview">
          <h2 className="font-medium">{preview.visitorName}</h2>
          <p className="mt-1 text-sm text-black/60">
            Flat {preview.flatNumber ?? "—"} · {preview.purpose ?? "No purpose"} ·{" "}
            <span className="badge">{preview.passStatus}</span>
          </p>
          <p className="mt-1 text-xs text-black/45">
            Expires {preview.expiresAt ?? "—"}
            {preview.phone ? ` · ${preview.phone}` : ""}
          </p>
        </div>
      )}

      <h2 className="mb-2 text-sm font-medium text-black/70">On site now</h2>
      {onsite === null ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : onsite.length === 0 ? (
        <div className="empty-state">No visitors checked in.</div>
      ) : (
        <ul className="space-y-2">
          {onsite.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-medium">{v.visitorName}</span>
                <span className="text-black/45"> · Flat {v.flatNumber ?? "—"}</span>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  void client.checkOutVisitor(v.id).then(loadOnsite).catch((err) => {
                    setError(err instanceof ApiClientError ? err.body.message : "Check-out failed");
                  })
                }
              >
                Check out
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
