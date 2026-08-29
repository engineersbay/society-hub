import { Link } from "react-router-dom";
import { LEGAL_LINKS } from "../lib/legal-links";

type Page = "home" | "privacy" | "terms";

const COPY: Record<
  Page,
  { title: string; body: string[] }
> = {
  home: {
    title: "SocietyHub",
    body: [
      "SocietyHub helps housing societies raise and track complaints in one place.",
      "This preview site is for testing only. It is not a production society portal.",
      "Use Privacy Policy and Terms below when Google OAuth asks for public links.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "This is a preview placeholder, not a legal privacy policy.",
      "Preview logins may use test phones, emails, and a development OTP.",
      "Do not enter real resident personal data on this environment.",
      "A real policy will be published on the product domain before go-live.",
    ],
  },
  terms: {
    title: "Terms of Service",
    body: [
      "This is a preview placeholder, not binding terms of service.",
      "The service may be reset, sleep when idle, or change without notice.",
      "Do not use this environment for live society operations.",
      "Binding terms will be published on the product domain before go-live.",
    ],
  },
};

export function LegalPage({ page }: { page: Page }) {
  const copy = COPY[page];
  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-10">
      <p className="font-display text-3xl text-[var(--leaf-dark)]">{copy.title}</p>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-black/70">
        {copy.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <nav className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link className="text-[var(--leaf)]" to={LEGAL_LINKS.home}>
          Home
        </Link>
        <Link className="text-[var(--leaf)]" to={LEGAL_LINKS.privacy}>
          Privacy Policy
        </Link>
        <Link className="text-[var(--leaf)]" to={LEGAL_LINKS.terms}>
          Terms of Service
        </Link>
        <Link className="text-[var(--leaf)]" to="/login">
          Sign in
        </Link>
      </nav>
    </div>
  );
}
