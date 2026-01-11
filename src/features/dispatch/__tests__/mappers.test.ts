import { describe, expect, it } from "vitest";
import { mapApiOrderToDispatchOrder, mapApiDriverProfileToOpsDriver, deriveDispatchStatus } from "../mappers";
import type { ApiDeliveryOrder, ApiDriverProfile } from "../api/opsApi";

describe("dispatch mappers", () => {
  it("derives assigned when driver_id present", () => {
    const o = { id: 1, dispatch_status: "none", driver_id: 99 } as unknown as ApiDeliveryOrder;
    expect(deriveDispatchStatus(o).status).toBe("assigned");
  });

  it("derives searching for search-like dispatch statuses", () => {
    const o = { id: 1, dispatch_status: "searching", driver_id: null } as unknown as ApiDeliveryOrder;
    expect(deriveDispatchStatus(o).status).toBe("searching");
  });

  it("derives offered for offer-like dispatch statuses", () => {
    const o = { id: 1, dispatch_status: "driver_offered", driver_id: null } as unknown as ApiDeliveryOrder;
    expect(deriveDispatchStatus(o).status).toBe("offered");
  });

  it("derives problem when issue_detected is truthy", () => {
    const o = { id: 1, dispatch_status: "none", issue_detected: true, driver_id: null } as unknown as ApiDeliveryOrder;
    expect(deriveDispatchStatus(o).status).toBe("problem");
  });

  it("maps api order into UI order safely", () => {
    const api = {
      id: 12,
      reference_no: "ABC123",
      flow_type: "store",
      status: "pending",
      dispatch_status: "none",
      pickup_address: "Pickup",
      pickup_latitude: 7.0,
      pickup_longitude: 126.0,
      dropoff_address: "Drop",
      created_at: "2025-12-31T00:00:00+08:00"
    } as unknown as ApiDeliveryOrder;

    const ui = mapApiOrderToDispatchOrder(api);
    expect(ui.id).toBe(12);
    expect(ui.referenceNo).toBe("ABC123");
    expect(ui.flowType).toBe("store");
    expect(ui.status).toBe("pending");
    expect(ui.pickupLat).toBe(7.0);
  });

  it("maps driver profile into UI driver", () => {
    const api = {
      id: 5,
      user_id: 9,
      status: "approved",
      user: {
        id: 9,
        name: "Driver A",
        status: "available",
        last_seen_at: "2025-12-31T00:00:00+08:00",
        latitude: 7.004,
        longitude: 126.33
      }
    } as unknown as ApiDriverProfile;

    const d = mapApiDriverProfileToOpsDriver(api);
    expect(d.id).toBe(9);
    expect(d.name).toBe("Driver A");
    expect(d.status).toBe("available");
    expect(d.profileStatus).toBe("approved");
  });
});
