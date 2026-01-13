import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import { AppProviders } from "@/app/providers";
import { AppRouter } from "@/app/router";
import { ErrorBoundary } from "@/app/shell/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>
);
