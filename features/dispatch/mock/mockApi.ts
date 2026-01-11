import { mockDb } from "./mockDb";
import type { DispatchOrder, OpsDriver, OrderDispatchStatus } from "../types";

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
type Db = Mutable<typeof mockDb>;

const db: Db = {
  orders: mockDb.orders.map((o) => ({ ...o })),
  drivers: mockDb.drivers.map((d) => ({ ...d }))
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitterLastSeen(driver: OpsDriver): OpsDriver {
  // simulate some drivers going stale / refreshing
  const t = new Date(driver.lastSeenAt).getTime();
  const bump = Math.random() < 0.6 ? 5_000 : -10_000;
  const next = new Date(Math.max(0, t + bump));
  return { ...driver, lastSeenAt: next.toISOString() };
}

export async function listOpsOrders(): Promise<DispatchOrder[]> {
  await sleep(180);
  return db.orders.map((o) => ({ ...o }));
}

export async function listOpsDrivers(): Promise<OpsDriver[]> {
  await sleep(180);
  db.drivers = db.drivers.map((d) => jitterLastSeen(d));
  return db.drivers.map((d) => ({ ...d }));
}

export async function assignDriverToOrder(input: {
  orderId: number;
  driverId: number;
}): Promise<{ ok: true }> {
  await sleep(220);

  const order = db.orders.find((o) => o.id === input.orderId);
  const driver = db.drivers.find((d) => d.id === input.driverId);

  if (!order) throw new Error("Order not found");
  if (!driver) throw new Error("Driver not found");

  // simple rule: offline can't be assigned
  if (driver.status === "offline") throw new Error("Driver is offline");

  order.driverId = driver.id;
  order.dispatchStatus = "assigned";

  // mark driver as busy
  driver.status = "busy";

  return { ok: true };
}

export function moveOrderStatus(orderId: number, next: OrderDispatchStatus) {
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return;
  order.dispatchStatus = next;
}
