import { describe, it, expect } from "vitest";
import { offerReducer } from "./offerReducer";
import type { OfferMap } from "./offerTypes";

describe("offerReducer", () => {
  it("handles OFFER_SENT", () => {
    const s: OfferMap = {};
    const next = offerReducer(s, {
      type: "OFFER_SENT",
      offer: { orderId: 1, driverId: 2, status: "pending", offeredAt: "x", expiresAt: "y" },
    });
    expect(next[1]).toBeTruthy();
    expect(next[1].driverId).toBe(2);
  });

  it("handles OFFER_EXPIRED", () => {
    const s: OfferMap = { 1: { orderId: 1, driverId: 2, status: "pending", offeredAt: "x", expiresAt: "y" } };
    const next = offerReducer(s, { type: "OFFER_EXPIRED", orderId: 1 });
    expect(next[1].status).toBe("expired");
  });
});
