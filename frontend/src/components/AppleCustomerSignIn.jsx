import { useEffect, useRef, useState } from "react";
import { getAppleChallenge, exchangeAppleCredential } from "@/services/auth-service";

const APPLE_SDK_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

let sdkPromise;
function loadSdk() {
  if (window.AppleID?.auth) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = APPLE_SDK_SRC;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        sdkPromise = undefined;
        reject(new Error("Apple SDK unavailable"));
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
}

/**
 * "Sign in with Apple" button for customers.
 *
 * Required by App Store Review Guideline 4.8: because the app offers Google
 * Sign-In, an equivalent login option (Sign in with Apple) must be presented on
 * iOS. It mirrors GoogleCustomerSignIn — the backend returns a challenge, the
 * Apple SDK produces an authorization, and the backend exchange returns the
 * same result shape, so the shared WhatsApp-link flow continues to work.
 *
 * Config (client id, redirect URI, nonce, state) comes from the backend
 * challenge, not from VITE_ env vars, matching the Google integration.
 */
export default function AppleCustomerSignIn({ onResult, onError }) {
  const callbacks = useRef({ onResult, onError });
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const challengeRef = useRef(null);

  useEffect(() => {
    callbacks.current = { onResult, onError };
  });

  useEffect(() => {
    let cancelled = false;
    async function setup() {
      try {
        const challenge = await getAppleChallenge();
        if (cancelled || !challenge?.enabled) return;
        await loadSdk();
        if (cancelled || !window.AppleID?.auth) return;
        challengeRef.current = challenge;
        window.AppleID.auth.init({
          clientId: challenge.clientId,
          scope: challenge.scope || "name email",
          redirectURI: challenge.redirectUri,
          nonce: challenge.nonce,
          state: challenge.state,
          usePopup: true,
        });
        setAvailable(true);
      } catch {
        if (!cancelled) setAvailable(false);
      }
    }
    setup();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = async () => {
    const challenge = challengeRef.current;
    if (!challenge || busy) return;
    setBusy(true);
    try {
      const data = await window.AppleID.auth.signIn();
      const authorization = data?.authorization || {};
      const result = await exchangeAppleCredential({
        code: authorization.code,
        idToken: authorization.id_token,
        nonce: challenge.nonce,
        state: authorization.state || challenge.state,
        // Apple returns `user` (name/email) only on the very first authorization.
        user: data?.user || null,
      });
      callbacks.current.onResult(result);
    } catch (error) {
      // User-cancelled popups report code "popup_closed_by_user" — stay silent.
      if (error?.error !== "popup_closed_by_user") {
        callbacks.current.onError(
          "Apple sign-in could not be completed. Try again or use WhatsApp.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  if (!available) return null;

  return (
    <div className="auth-apple-sign-in">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-busy={busy}
        className="auth-apple-button"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="currentColor"
        >
          <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516.024.034 1.52.087 2.475-1.258.955-1.345.762-2.391.728-2.43Zm3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422.212-2.189 1.675-2.789 1.698-2.854.023-.065-.597-.79-1.254-1.157a3.692 3.692 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56.244.729.625 1.924 1.273 2.796.576.984 1.34 1.667 1.659 1.899.319.232 1.219.386 1.843.067.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758.347-.79.505-1.217.473-1.282Z" />
        </svg>
        <span>{busy ? "Verifying Apple account…" : "Continue with Apple"}</span>
      </button>
    </div>
  );
}
