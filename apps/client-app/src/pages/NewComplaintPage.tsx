import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ComplaintType } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";

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
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

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
        text += ev.results[i][0].transcript;
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
      const created = await client.createComplaint({
        title,
        type,
        typeOtherText: type === "other" ? typeOtherText : null,
        description,
      });
      for (const file of files) {
        await client.uploadAttachment(created.id, file);
      }
      navigate(`/complaints/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl">Raise complaint</h1>
      <p className="mt-1 text-sm text-black/55">
        Flat is set from your profile
        {user?.flatNumber ? `: ${user.flatNumber}` : ""}.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="type">
            Type
          </label>
          <select
            id="type"
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as ComplaintType)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {type === "other" && (
          <div>
            <label className="label" htmlFor="other">
              Specify
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
              Description
            </label>
            <button type="button" className="btn btn-ghost text-xs" onClick={toggleMic}>
              {listening ? "Stop mic" : "Voice to text"}
            </button>
          </div>
          <textarea
            id="desc"
            className="input min-h-28"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="files">
            Photos / videos
          </label>
          <input
            id="files"
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </div>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <button className="btn btn-primary" disabled={busy} type="submit">
          Submit
        </button>
      </form>
    </div>
  );
}
