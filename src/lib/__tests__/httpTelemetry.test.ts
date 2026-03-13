import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/http";
import { onSecurityEvent, type SecurityEvent } from "@/lib/securityTelemetry";

describe("http telemetry", () => {
  const originalEnv = (import.meta as any).env;

  beforeEach(() => {
    (import.meta as any).env = {
      ...originalEnv,
      VITE_API_BASE_URL: "http://localhost:8000/api/v1",
    };
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    (import.meta as any).env = originalEnv;
  });

  it("adds request correlation headers", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true }),
    });

    await apiFetch("/health", { method: "GET" });

    const [, init] = (fetch as any).mock.calls[0];
    const headers = init.headers as Headers;

    expect(String(headers.get("X-Request-Id") || "").startsWith("web-")).toBe(true);
    expect(headers.get("X-Correlation-Id")).toBe(headers.get("X-Request-Id"));
  });

  it("emits security telemetry for 401 responses", async () => {
    const events: SecurityEvent[] = [];
    const off = onSecurityEvent((event: SecurityEvent) => events.push(event));

    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: {
        get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
      },
      json: async () => ({ message: "Unauthenticated." }),
      text: async () => "Unauthenticated.",
    });

    await expect(apiFetch("/user", { method: "GET" })).rejects.toBeInstanceOf(ApiError);

    off();

    expect(events.length).toBe(1);
    expect(events[0].code).toBe("http_401");
    expect(events[0].source).toBe("http");
    expect(events[0].path).toBe("/user");
  });
});
