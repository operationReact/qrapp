// import './setupErrorHandler';
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { initNativeShell } from './native/capacitor'
import "./index.css";
import "./styles/auth-login.css";
import "./styles/partner-header-branding.css";
import "./styles/partner-dashboard.css";
import ErrorBoundary from './components/ErrorBoundary';

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

function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
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

// No-op on web / Android TWA; initializes the iOS (Capacitor) native shell.
initNativeShell(router);

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
