export type OpsWindow = {
  start: string;
  end: string;
  days: number;
};

export type OpsOverviewOrders = {
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  by_status: Record<string, number>;
};

export type OpsOverviewFinance = {
  revenue_total: number;
};

export type OpsOverviewDelivery = {
  avg_delivery_minutes: number;
};

export type OpsOverviewDrivers = {
  active: number;
  idle: number;
};

export type OpsOverviewResponse = {
  window: OpsWindow;
  orders: OpsOverviewOrders;
  finance: OpsOverviewFinance;
  delivery: OpsOverviewDelivery;
  drivers: OpsOverviewDrivers;
};

export type OpsOrdersSeriesPoint = {
  day: string;
  orders: number;
  revenue: number;
};

export type OpsOrdersResponse = {
  window: OpsWindow;
  series: OpsOrdersSeriesPoint[];
  by_status: Record<string, number>;
};

export type OpsDriverRow = {
  driver_id: number;
  name?: string | null;
  email?: string | null;
  completed_count: number;
  avg_driver_fare: number;
  avg_delivery_minutes: number;
};

export type OpsDriversResponse = {
  window: OpsWindow;
  top_drivers: OpsDriverRow[];
};

export type OpsInventoryStoreRow = {
  store_id: number;
  store_name?: string | null;
  total_products: number;
  out_of_stock: number;
  low_stock: number;
};

export type OpsInventoryResponse = {
  window: OpsWindow;
  threshold: {
    low_stock: number;
  };
  totals: {
    total_products: number;
    out_of_stock: number;
    low_stock: number;
  };
  stores: OpsInventoryStoreRow[];
};

export type OpsFraudSignals = {
  high_cancellation_customers: Array<{
    customer_id: number;
    name?: string | null;
    email?: string | null;
    cancelled_count: number;
  }>;
  wallet_adjustments: {
    driver_wallet_adjustments: number;
    reward_wallet_adjustments: number;
  };
  audit_refund_related_actions: number;
};

export type OpsFraudResponse = {
  window: OpsWindow;
  signals: OpsFraudSignals;
  note: string;
};

export type OpsParcelCodResponse = {
  outstanding_total: number;
  drivers_with_outstanding: number;
  orders_to_collect: number;
  orders_collected_not_settled: number;
  orders_overdue: number;
  grace_hours: number;
  server_time: string;
};

export type OpsKpiRange = "today" | "7d" | "30d";
