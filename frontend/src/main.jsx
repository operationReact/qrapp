// import './setupErrorHandler';
import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import "./index.css";
import "./styles/auth-login.css";
import "./styles/partner-header-branding.css";
import "./styles/partner-dashboard.css";
import "./styles/ios-hardening.css";
import ErrorBoundary from './components/ErrorBoundary';
import { installMobileKeyboardHandling } from './lib/mobileKeyboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

const rootEl = document.getElementById("root");

function markNativePlatform() {
  if (!Capacitor.isNativePlatform()) return;
  const platform = Capacitor.getPlatform();
  document.documentElement.classList.add("capacitor-native", `capacitor-${platform}`);
  document.documentElement.dataset.nativePlatform = platform;
}

function keepSameOriginLinksInNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!anchor || anchor.target !== "_blank") return;

    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    event.preventDefault();
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  });
}

markNativePlatform();
keepSameOriginLinksInNativeShell();
installMobileKeyboardHandling();

function registerServiceWorker() {
  // Capacitor packages the web assets locally. A service worker is unnecessary in
  // the native shell and can make review/testing behavior harder to reason about.
  if (Capacitor.isNativePlatform() || !import.meta.env.PROD || !("serviceWorker" in navigator)) {
    return;
  }

  const register = () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("[pwa] service worker registration failed", error);
    });
  };

  if (document.readyState === "complete") {
    register();
    return;
  }

  window.addEventListener("load", register, { once: true });
}

registerServiceWorker();

if (!rootEl) {
    console.error('Root element (#root) not found in document');
} else {
    ReactDOM.createRoot(rootEl).render(
        <React.StrictMode>
            <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>
            </ErrorBoundary>
        </React.StrictMode>
    );
}
