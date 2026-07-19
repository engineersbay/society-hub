import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ComplaintType, FlatDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { Icon } from "../components/icons";
import { TYPE_LABELS } from "@society-hub/ui";

const TYPES: ComplaintType[] = [
  "electric",
  "plumbing",
  "housekeeping",
  "security",
  "lift",
  "other",
];

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
};

export function NewComplaintPage() {
  const { client, user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ComplaintType>("plumbing");
  const [typeOtherText, setTypeOtherText] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flats, setFlats] = useState<FlatDto[]>([]);
  const [flatId, setFlatId] = useState(user?.flatId ?? "");
  const needsFlatPicker = !user?.flatId;
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const previews = useMemo(
    () =>
      files.map((f) => ({
        name: f.name,
        url: URL.createObjectURL(f),
        isImage: f.type.startsWith("image/"),
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  useEffect(() => {
    if (!needsFlatPicker) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await client.listFlats();
        if (cancelled) return;
        setFlats(rows);
        setFlatId((current) => current || rows[0]?.id || "");
      } catch {
        if (!cancelled) {
          setError("Could not load flats for this society. Select a society first.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, needsFlatPicker]);

  function toggleMic() {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition not supported in this browser");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";
    rec.onresult = (ev) => {
      let text = "";
      for (let i = 0; i < ev.results.length; i++) {
        text += ev.results[i]![0]!.transcript;
      }
      setDescription(text);
    };
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (needsFlatPicker && !flatId) {
        setError("Select a flat to raise this complaint");
        setBusy(false);
        return;
      }
      const created = await client.createComplaint({
        title,
        type,
        typeOtherText: type === "other" ? typeOtherText : null,
        description,
        flatId: needsFlatPicker ? flatId : undefined,
      });
      for (const file of files) {
        await client.uploadAttachment(created.id, file);
      }
      navigate(`/complaints/${created.id}`, {
        state: { justCreated: true },
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sh-page">
      <div className="sh-page-header">
        <div>
          <h1 className="font-display text-xl sm:text-2xl">Raise a complaint</h1>
          <p className="mt-0.5 text-sm text-black/55">
            Add photos if you can — you get a ticket number right away.
          </p>
        </div>
      </div>
      {user?.flatNumber && (
        <p className="mb-3 rounded-lg bg-[var(--mist)]/50 px-3 py-1.5 text-sm text-[var(--leaf-dark)]">
          Filing for flat <strong>{user.flatNumber}</strong>
        </p>
      )}

      <form className="card sh-section space-y-3" onSubmit={onSubmit} data-testid="new-complaint-form">
        {needsFlatPicker && (
          <div>
            <label className="label" htmlFor="flat">
              Which flat?
            </label>
            <select
              id="flat"
              className="input"
              data-testid="complaint-flat"
              value={flatId}
              onChange={(e) => setFlatId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select flat
              </option>
              {flats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.wingName ? `${f.wingName}-` : ""}
                  {f.number}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label" htmlFor="title">
            Short title
          </label>
          <input
            id="title"
            className="input"
            data-testid="complaint-title"
            placeholder="e.g. Water leakage in bathroom"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
          />
        </div>

        <div>
          <p className="label">Type</p>
          <div className="mt-1 flex flex-wrap gap-1.5" data-testid="complaint-type-chips">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                data-testid={`complaint-type-${t}`}
                className={[
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  type === t
                    ? "border-[var(--leaf)] bg-[var(--leaf)] text-white"
                    : "border-[var(--sand)] bg-white text-[var(--ink)]/80 hover:border-[var(--leaf)]",
                ].join(" ")}
                onClick={() => setType(t)}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {type === "other" && (
          <div>
            <label className="label" htmlFor="other">
              Tell us the type
            </label>
            <input
              id="other"
              className="input"
              value={typeOtherText}
              onChange={(e) => setTypeOtherText(e.target.value)}
              required
            />
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0" htmlFor="desc">
              What happened?
            </label>
            <button
              type="button"
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                listening
                  ? "border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]"
                  : "border-[var(--sand)] bg-white text-[var(--leaf-dark)] hover:border-[var(--leaf)]",
              ].join(" ")}
              data-testid="complaint-description-mic"
              aria-pressed={listening}
              aria-label={listening ? "Stop recording" : "Record description with microphone"}
              onClick={toggleMic}
            >
              <Icon name="mic" className="h-4 w-4" />
              {listening ? "Stop" : "Record"}
            </button>
          </div>
          <textarea
            id="desc"
            className="input min-h-24"
            data-testid="complaint-description"
            placeholder="A few sentences help the office understand and fix it faster."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={3}
          />
        </div>

        <div>
          <label className="label" htmlFor="files">
            Photos or short video (optional)
          </label>
          <input
            id="files"
            data-testid="complaint-files"
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {previews.length > 0 && (
            <ul className="mt-2 grid grid-cols-3 gap-2">
              {previews.map((p) => (
                <li
                  key={p.name}
                  className="overflow-hidden rounded-lg border border-[var(--sand)] bg-[var(--mist)]/30"
                >
                  {p.isImage ? (
                    <img src={p.url} alt="" className="h-16 w-full object-cover" />
                  ) : (
                    <p className="p-2 text-xs text-black/55">{p.name}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <button
          className="btn btn-primary w-full sm:w-auto"
          disabled={busy}
          type="submit"
          data-testid="complaint-submit"
        >
          {busy ? "Submitting…" : "Submit complaint"}
        </button>
      </form>
    </div>
  );
}
