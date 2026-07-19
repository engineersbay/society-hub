import { FormEvent, useEffect, useState } from "react";
import type { NoticeDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { canUseAdminMode, useAppMode } from "../app-mode";

function StaffNoticesView() {
  const { client } = useAuth();
  const [items, setItems] = useState<NoticeDto[] | null>(null);
  const [notReady, setNotReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    client
      .listNotices()
      .then((rows) => setItems(rows))
      .catch((err) => {
        setItems([]);
        if (err instanceof ApiClientError && err.status === 404) setNotReady(true);
        else setError(err instanceof Error ? err.message : "Failed to load");
      });
  }

  useEffect(load, [client]);

  function startEdit(n: NoticeDto) {
    setEditingId(n.id);
    setTitle(n.title);
    setBody(n.body);
    setAudience(n.audience);
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setAudience("all");
    setShowForm(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await client.updateNotice(editingId, { title, body });
      } else {
        await client.createNotice({ title, body, audience });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed to save notice");
    }
  }

  async function togglePublish(n: NoticeDto) {
    setBusy(n.id);
    setError(null);
    try {
      if (n.publishedAt && !n.unpublishedAt) {
        await client.unpublishNotice(n.id);
      } else {
        await client.publishNotice(n.id);
      }
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed to update notice");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Notices</h1>
          <p className="mt-1 text-sm text-black/55">Publish notices for all residents, a wing, or a flat.</p>
        </div>
        <button type="button" data-testid="notices-add-toggle" className="btn btn-primary text-sm" onClick={startNew}>
          New notice
        </button>
      </div>

      {showForm && (
        <form className="card mb-6 space-y-4 p-5" data-testid="notices-form" onSubmit={submit}>
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="body">Body</label>
            <textarea id="body" className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} required />
          </div>
          {!editingId && (
            <div className="max-w-xs">
              <label className="label" htmlFor="audience">Audience</label>
              <select id="audience" className="input" value={audience} onChange={(e) => setAudience(e.target.value)}>
                <option value="all">All residents</option>
                <option value="wing">A wing</option>
                <option value="flat">A flat</option>
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn btn-primary" data-testid="notices-submit" type="submit">
              {editingId ? "Save changes" : "Create draft"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
      {notReady && (
        <p className="mb-4 text-sm text-[var(--alert)]">
          Notices API isn't live yet — this screen will populate automatically once it is.
        </p>
      )}

      {items === null ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="empty-state" data-testid="notices-empty">No notices yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((n) => {
            const published = Boolean(n.publishedAt && !n.unpublishedAt);
            return (
              <div key={n.id} className="card p-5" data-testid="notice-card">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{n.title}</h3>
                  <span className={`badge ${published ? "badge-success" : ""}`}>
                    {published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-black/60">{n.body}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-black/35">{n.audience}</p>
                <div className="mt-4 flex gap-2">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(n)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    data-testid="notice-toggle-publish"
                    disabled={busy === n.id}
                    onClick={() => togglePublish(n)}
                  >
                    {published ? "Unpublish" : "Publish"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResidentNoticesView() {
  const { client } = useAuth();
  const [items, setItems] = useState<NoticeDto[] | null>(null);
  const [notReady, setNotReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .listNotices()
      .then((rows) => setItems(rows.filter((n) => n.publishedAt && !n.unpublishedAt)))
      .catch((err) => {
        setItems([]);
        if (err instanceof ApiClientError && err.status === 404) setNotReady(true);
        else setError(err instanceof Error ? err.message : "Failed to load");
      });
  }, [client]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl">Notices</h1>
        <p className="mt-1 text-sm text-black/55">Announcements from your society.</p>
      </div>

      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
      {notReady && (
        <p className="mb-4 text-sm text-[var(--alert)]">
          Notices aren't live yet — this screen will populate automatically once they are.
        </p>
      )}

      {items === null ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="empty-state" data-testid="notices-empty">No notices right now.</div>
      ) : (
        <div className="space-y-3" data-testid="notices-list">
          {items.map((n) => (
            <div key={n.id} className="card p-5">
              <h3 className="font-semibold">{n.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-black/65">{n.body}</p>
              <p className="mt-2 text-xs text-black/35">
                {n.publishedAt ? new Date(n.publishedAt).toLocaleString() : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NoticesPage() {
  const { user } = useAuth();
  const { mode } = useAppMode();
  const staffView = canUseAdminMode(user?.role) && mode === "admin";
  return staffView ? <StaffNoticesView /> : <ResidentNoticesView />;
}
