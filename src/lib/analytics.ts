export type AnalyticsPayload = Record<string, unknown>;

export function trackEvent(name: string, payload?: AnalyticsPayload) {
  if (typeof window === "undefined") return;
  try {
    (window as any).analytics?.track?.(name, payload ?? {});
  } catch {
    // ignore
  }
  try {
    (window as any).gtag?.("event", name, payload ?? {});
  } catch {
    // ignore
  }
  try {
    (window as any).dataLayer?.push?.({ event: name, ...(payload ?? {}) });
  } catch {
    // ignore
  }
}

export function trackScreenView(screen: string, payload?: AnalyticsPayload) {
  trackEvent("screen_view", { screen, ...(payload ?? {}) });
}
