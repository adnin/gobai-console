export type SettlementStore = {
  id: number;
  name: string;
};

export type SettlementAmounts = {
  earned_cents: number;
  pending_cents: number;
  paid_cents: number;
};

export type SettlementHold = Record<string, unknown>;

export type MerchantSettlementSummary = {
  store: SettlementStore;
  summary: SettlementAmounts;
  holds: SettlementHold[];
  next_release_at: string | null;
  last_reconciled_at: string | null;
};

export type MerchantSettlementSummaryResponse = {
  data: MerchantSettlementSummary;
};
