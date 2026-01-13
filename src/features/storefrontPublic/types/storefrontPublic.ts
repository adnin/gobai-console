export type PublicStorefrontStore = {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  address?: string | null;
  status: string;
  is_paused: boolean;
  pause_reason?: string | null;
  prep_time_minutes?: number | null;
  order_cutoff_minutes?: number | null;
  min_order_amount_cents?: number | null;
  service_area: {
    geometry?: any;
    geojson?: any;
  };
  hours: {
    open?: string | null;
    close?: string | null;
  };
  updated_at?: string;
};

export type PublicStorefrontProduct = {
  id: number;
  name: string;
  description?: string | null;
  price_cents: number;
  image_url?: string | null;
  is_available: boolean;
  category_id: number;
  sort_order?: number;
};

export type PublicStorefrontCategory = {
  id: number;
  name: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
  products: PublicStorefrontProduct[];
};

export type PublicStorefrontCatalog = {
  categories: PublicStorefrontCategory[];
};

export type PublicStorefrontData = {
  store: PublicStorefrontStore;
  catalog: PublicStorefrontCatalog;
};

export type PublicStorefrontResponse = PublicStorefrontData & {
  metadata: {
    cached_at: string;
    expires_at: string;
    cache_seconds: number;
  };
};