export type StuckOrderContact = {
  id: number;
  name: string;
  mobile: string;
};

export type StuckOrderStore = {
  id: number;
  name: string;
};

export type StuckOrder = {
  order_id: number;
  reference_no: string;
  status: string;
  dispatch_status: string;
  reason_code: string;
  reason: string;
  recommended_action: string;
  last_event_at: string | null;
  age_minutes: string;
  customer?: StuckOrderContact | null;
  driver?: StuckOrderContact | null;
  store?: StuckOrderStore | null;
  meta?: string | string[] | null;
};

export type StuckOrdersResponse = {
  data: StuckOrder[];
};

export type StuckOrderFilters = {
  reason?: string | null;
  status?: string | null;
  maxAgeMinutes?: number | null;
};

export function parseAgeMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const numeric = Number.parseFloat(value);
  if (!Number.isNaN(numeric)) return numeric;
  const digits = value.match(/\d+/);
  return digits ? Number(digits[0]) : null;
}
