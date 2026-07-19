import { FormEvent, useEffect, useState } from "react";
import { ApiClientError } from "@society-hub/sdk";

export type CrudField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "datetime-local" | "number";
  required?: boolean;
  placeholder?: string;
};

export type CrudColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
};

export function SimpleCrudPage<T extends { id: string }>({
  title,
  description,
  columns,
  fields,
  onList,
  onCreate,
  createLabel = "Add",
  testId,
  emptyLabel = "Nothing here yet.",
}: {
  title: string;
  description: string;
  columns: CrudColumn<T>[];
  fields: CrudField[];
  onList: () => Promise<T[]>;
  onCreate?: (values: Record<string, string>) => Promise<T>;
  createLabel?: string;
  testId: string;
  emptyLabel?: string;
}) {
  const [items, setItems] = useState<T[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notReady, setNotReady] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    onList()
      .then((rows) => setItems(rows))
      .catch((err) => {
        setItems([]);
        if (err instanceof ApiClientError && err.status === 404) {
          setNotReady(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!onCreate) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(values);
      setValues({});
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-xl sm:text-2xl">{title}</h1>
          <p className="mt-0.5 text-sm text-black/55">{description}</p>
        </div>
        {onCreate && (
          <button
            type="button"
            data-testid={`${testId}-add-toggle`}
            className="btn btn-primary text-sm"
            onClick={() => setShowForm((s) => !s)}
          >
            {showForm ? "Cancel" : createLabel}
          </button>
        )}
      </div>

      {showForm && onCreate && (
        <form
          className="card sh-section mb-4 grid gap-2.5 sm:grid-cols-2"
          data-testid={`${testId}-form`}
          onSubmit={submit}
        >
          {fields.map((f) => (
            <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : undefined}>
              <label className="label" htmlFor={`${testId}-${f.name}`}>
                {f.label}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  id={`${testId}-${f.name}`}
                  className="input"
                  rows={3}
                  required={f.required}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                />
              ) : (
                <input
                  id={`${testId}-${f.name}`}
                  data-testid={`${testId}-input-${f.name}`}
                  className="input"
                  type={f.type ?? "text"}
                  required={f.required}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <div className="sm:col-span-2">
            <button className="btn btn-primary" data-testid={`${testId}-submit`} disabled={busy} type="submit">
              Save
            </button>
          </div>
        </form>
      )}

      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
      {notReady && (
        <p className="mb-4 text-sm text-[var(--alert)]">
          This module's API isn't live yet — the screen is ready and will populate automatically once it is.
        </p>
      )}

      {items === null ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="empty-state" data-testid={`${testId}-empty`}>
          {emptyLabel}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" data-testid={`${testId}-table`}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
