export type MerchantKpiStore = {
  id: number;
  name: string;
  slug: string;
};

export type MerchantKpiFilters = {
  start_date: string;
  end_date: string;
  timezone: string;
};

export type MerchantKpiSnapshot = {
  start_date: string;
  end_date: string;
  orders_total: number;
  orders_completed: number;
  orders_cancelled: number;
  completion_rate: number;
  gross_revenue_cents: number;
  net_revenue_cents: number;
};

export type MerchantKpiBuckets = {
  daily: unknown[];
  weekly: unknown[];
};

export type MerchantKpiResource = {
  store: MerchantKpiStore;
  filters: MerchantKpiFilters;
  generated_at: string;
  daily: MerchantKpiSnapshot;
  weekly: MerchantKpiSnapshot;
  buckets: MerchantKpiBuckets;
};

export type MerchantKpiResponse = {
  data: MerchantKpiResource;
};

export type MerchantKpiRange = "today" | "7d" | "30d";
