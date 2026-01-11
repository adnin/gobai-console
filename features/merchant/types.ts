export type MerchantOrder = {
  id: number;
  reference_no?: string;
  created_at?: string;
  updated_at?: string;

  // core lifecycle
  status?: string; // pending, cancelled, completed, delivered, ...
  store_status?: string; // new, accepted, preparing, ready
  prep_status?: string | null;

  // payments
  payment_method?: string; // wallet, gcash_qr, cod, ...
  payment_status?: string; // unpaid, captured, verified, awaiting_quote, awaiting_customer, ...
  payment_reference?: string;
  payment_expires_at?: string | null;

  // dispatch
  dispatch_status?: string;
  dispatch_at?: string | null;

  // paper/pharmacy
  request_kind?: string; // e.g. pharmacy
  requires_quote_confirmation?: boolean;
  quote_status?: string; // none, ready, accepted, ...

  request_notes?: string;
  request_attachments?: any; // can be array or json string depending on endpoint

  // totals (merchant-safe)
  items_total?: number;
  total_price?: number;
};

export type MerchantOrderListResponse = {
  data: MerchantOrder[];
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

export type MerchantOrderDetails = {
  id: number;
  reference_no?: string;
  store_id?: number;
  driver_id?: number | null;

  flow_type?: string;
  status?: string;
  store_status?: string;
  prep_status?: string | null;

  request_kind?: string;
  requires_quote_confirmation?: boolean;
  quote_status?: string;
  quote_payload?: any;

  patient_name?: string;
  patient_birthdate?: string;
  request_notes?: string;

  request_attachments?: Array<{ name: string; mime?: string | null; url?: string | null; thumb_url?: string | null }>;

  payment_method?: string;
  payment_status?: string;
  payment_reference?: string;
  payment_expires_at?: string | null;

  dispatch_status?: string;
  dispatch_at?: string | null;
  assigned_at?: string | null;

  items_total?: number;
  total_price?: number;
  totals?: any;

  items?: any[];
  driver?: { id: number; name?: string; phone?: string } | null;
};

export type MerchantPaperQuoteRequest = {
  items: Array<{
    name: string;
    qty: number;
    price: number;
    notes?: string | null;
    substitutions?: Array<{
      name: string;
      price?: number | null;
      price_delta?: number | null;
      notes?: string | null;
    }>;
  }>;
  pharmacist_notes?: string | null;
  partial_fill_allowed?: boolean;
  partial_fill_notes?: string | null;
};

export type MerchantOkResponse = { ok: boolean; [k: string]: any };
