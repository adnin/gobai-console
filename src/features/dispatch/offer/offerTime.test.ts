import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeExpiresAt, msRemaining } from "./offerTime";

describe("offerTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computeExpiresAt returns ISO string in the future", () => {
    const offeredAt = "2026-01-01T00:00:00.000Z";
    const exp = computeExpiresAt(offeredAt);
    expect(exp).toBeTruthy();
    expect(new Date(exp!).getTime()).toBeGreaterThan(new Date(offeredAt).getTime());
  });

  it("msRemaining clamps to >= 0", () => {
    const exp = "2026-01-01T00:00:10.000Z";
    expect(msRemaining(exp)).toBe(10_000);
    vi.setSystemTime(new Date("2026-01-01T00:00:12.000Z"));
    expect(msRemaining(exp)).toBe(0);
  });
});
