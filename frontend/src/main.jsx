// import './setupErrorHandler';
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { router } from './router'
import "./index.css";
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
if (!rootEl) {
    console.error('Root element (#root) not found in document');
} else {
    ReactDOM.createRoot(rootEl).render(
        <React.StrictMode>
            <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
            </ErrorBoundary>
        </React.StrictMode>
    );
}
