import { useEffect, useRef, useState } from "react";
import { getGoogleChallenge, exchangeGoogleCredential } from "@/services/auth-service";

let sdkPromise;
function loadSdk() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => { script.remove(); sdkPromise = undefined; reject(new Error("Google SDK unavailable")); };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
}

export default function GoogleCustomerSignIn({ onResult, onError }) {
  const host = useRef(null);
  const callbacks = useRef({ onResult, onError });
  callbacks.current = { onResult, onError };
  const [available, setAvailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function setup() {
      try {
        const challenge = await getGoogleChallenge();
        if (cancelled || !challenge.enabled) return;
        setAvailable(true);
        await loadSdk();
        if (cancelled || !host.current) return;
        const id = window.google.accounts.id;
        id.initialize({
          client_id: challenge.clientId,
          nonce: challenge.nonce,
          auto_select: false,
          ux_mode: "popup",
          callback: async ({ credential }) => {
            if (cancelled || !credential) return;
            setBusy(true);
            try {
              const result = await exchangeGoogleCredential({ credential, nonce: challenge.nonce });
              if (!cancelled) callbacks.current.onResult(result);
            } catch {
              if (!cancelled) {
                callbacks.current.onError("Google sign-in could not be completed. Try again or use WhatsApp.");
                setAttempt(n => n + 1);
              }
            } finally { if (!cancelled) setBusy(false); }
          },
        });
        host.current.replaceChildren();
        id.renderButton(host.current, { theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width: Math.min(400, Math.max(200, Math.floor(host.current.clientWidth))) });
      } catch {
        if (!cancelled) setAvailable(false);
      }
    }
    setup();
    return () => { cancelled = true; };
  }, [attempt]);
  return <div hidden={!available} className="auth-google-sign-in">
    <div ref={host} aria-busy={busy} />
    {busy && <p role="status" className="auth-field-hint">Verifying Google account…</p>}
  </div>;
}
