export type AdminOrderUser = {
  id: number;
  name: string;
  email: string;
  mobile: string;
};

export type AdminOrderStore = {
  id: number;
  name: string;
};

export type AdminOrder = {
  id: number;
  reference_no: string;
  status: string;
  store_status: string;
  dispatch_status: string;
  driver_id: number | null;
  store_id: number | null;
  customer_id: number | null;
  pickup_address: string;
  dropoff_address: string;
  created_at: string | null;
  updated_at: string | null;
  customer?: AdminOrderUser | null;
  driver?: AdminOrderUser | null;
  store?: AdminOrderStore | null;
  driver_signals?: unknown;
};

export type AdminOrderMeta = {
  page?: number;
  current_page?: number;
  per_page?: number;
  total?: number;
  last_page?: number;
};

export type AdminOrdersResponse = {
  data: AdminOrder[];
  meta?: AdminOrderMeta;
};

export type AdminOrderResponse = {
  data: AdminOrder;
};

export type AdminReassignDriverPayload = {
  driver_id: number;
  note?: string | null;
};

export type AdminUnassignDriverPayload = {
  reason: string;
  note?: string | null;
};

export type OrderTimelineEntry = {
  id: string;
  type: string;
  timestamp: string | null;
  meta?: Record<string, unknown>;
};

export type OrderTimeline = {
  timeline: OrderTimelineEntry[];
};

export type OrderTimelineResponse = {
  data: OrderTimeline;
};

export type AdminOrderStatus =
  | "pending"
  | "pending_payment"
  | "accepted"
  | "arrived"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled";

export type AdminOrderFilters = {
  order_id?: number | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  driver_id?: number | null;
  store_id?: number | null;
  status?: AdminOrderStatus | "" | null;
  page?: number;
  per_page?: number;
};
