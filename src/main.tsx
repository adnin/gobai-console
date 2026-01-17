import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import { AppProviders } from "@/app/providers";
import { AppRouter } from "@/app/router";
import { ErrorBoundary } from "@/app/shell/ErrorBoundary";

const viteEnv = (import.meta as any)?.env ?? {};
const runtimeConfig = {
  apiBaseUrl: viteEnv.VITE_API_BASE_URL,
  socketUrl: viteEnv.VITE_SOCKET_URL,
};

const expectedProdApiBaseUrl = "https://api.gobai.app/api/v1";
const expectedProdSocketUrl = "https://api.gobai.app";
const isProdBuild = Boolean(viteEnv.PROD);
const resolvedMode = isProdBuild ? "production" : "development";

if (isProdBuild) {
  const apiMatchesExpected = runtimeConfig.apiBaseUrl === expectedProdApiBaseUrl;
  const socketMatchesExpected = runtimeConfig.socketUrl === expectedProdSocketUrl;

  console.info("[RuntimeConfig] Production env detected", {
    apiBaseUrl: runtimeConfig.apiBaseUrl,
    apiMatchesExpected,
    socketUrl: runtimeConfig.socketUrl,
    socketMatchesExpected,
  });

  if (!apiMatchesExpected || !socketMatchesExpected) {
    console.warn("[RuntimeConfig] Production env mismatch", {
      expectedApiBaseUrl: expectedProdApiBaseUrl,
      expectedSocketUrl: expectedProdSocketUrl,
    });
  }
} else {
  console.info("[RuntimeConfig] Non-production env", {
    mode: resolvedMode,
    ...runtimeConfig,
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>
);
