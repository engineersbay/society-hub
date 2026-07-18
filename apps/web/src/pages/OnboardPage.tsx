import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import type { FlatDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";

export function OnboardPage() {
  const { user, client } = useAuth();
  const [flats, setFlats] = useState<FlatDto[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [flatId, setFlatId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") return;
    client.listFlats().then((rows) => {
      setFlats(rows);
      if (rows[0]) setFlatId(rows[0].id);
    });
  }, [client, user]);

  if (user?.role !== "admin") return <Navigate to="/complaints" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await client.onboardResident({ name, phone, flatId });
      setMessage(`Onboarded ${res.user.name} (${res.user.phone})`);
      setName("");
      setPhone("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="font-display text-2xl">Onboard resident</h1>
      <p className="mt-1 text-sm text-black/55">
        Link a phone and flat so they can log in and raise complaints.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="flat">
            Flat
          </label>
          <select
            id="flat"
            className="input"
            value={flatId}
            onChange={(e) => setFlatId(e.target.value)}
            required
          >
            {flats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.wingName ? `${f.wingName}-` : ""}
                {f.number}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit">
          Onboard
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-[var(--leaf)]">{message}</p>}
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
