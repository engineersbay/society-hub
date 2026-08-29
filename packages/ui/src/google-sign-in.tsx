import { useEffect, useRef } from "react";

const GIS_SRC = "https://accounts.google.com/gsi/client";

export function googleSignInMode(
  clientId: string | undefined,
): "gis" | "dev" {
  return clientId?.trim() ? "gis" : "dev";
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme: string; size: string; text: string; width: number },
          ) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({
  clientId,
  disabled,
  onCredential,
}: {
  clientId: string;
  disabled?: boolean;
  onCredential: (idToken: string) => void;
}) {
  const slot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientId || disabled) return;
    let cancelled = false;

    function render() {
      const el = slot.current;
      const gis = window.google?.accounts.id;
      if (!el || !gis || cancelled) return;
      el.replaceChildren();
      gis.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) onCredential(response.credential);
        },
      });
      gis.renderButton(el, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: 320,
      });
    }

    if (window.google?.accounts.id) {
      render();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", render);
      return () => {
        cancelled = true;
        existing.removeEventListener("load", render);
      };
    }

    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, onCredential]);

  return (
    <div
      ref={slot}
      className="flex justify-center"
      data-testid="google-gis-button"
    />
  );
}
