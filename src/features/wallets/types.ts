export type DriverWallet = {
  balance_points: number;
  status: string;
  min_required_to_work: number;
};

export type DriverWalletTransaction = {
  id: number;
  wallet_id: number;
  type: string;
  points: number;
  reference_type: string | null;
  reference_id: number | null;
  meta: unknown[] | null;
  created_by: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DriverWalletLedgerResponse = {
  balance_points: number;
  transactions: DriverWalletTransaction[];
};

export type AdminDriverWalletDriver = {
  id: number;
  name: string;
  email: string;
  status: string;
};

export type AdminDriverWalletSnapshot = {
  driver: AdminDriverWalletDriver;
  wallet: {
    balance_points: number;
    status: string;
  };
};

export type PaginatedMeta = {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

export type PaginatedPayload<T> = {
  data: T[];
  meta?: PaginatedMeta;
} & PaginatedMeta;

export type AdminDriverWalletLedgerResponse = {
  balance_points: number;
  transactions: PaginatedPayload<DriverWalletTransaction>;
};
