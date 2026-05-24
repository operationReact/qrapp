import './setupErrorHandler';
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import "./index.css";
import ErrorBoundary from './components/ErrorBoundary';

const rootEl = document.getElementById("root");
if (!rootEl) {
    console.error('Root element (#root) not found in document');
} else {
    ReactDOM.createRoot(rootEl).render(
        <React.StrictMode>
            <ErrorBoundary>
                <RouterProvider router={router} />
            </ErrorBoundary>
        </React.StrictMode>
    );
}
