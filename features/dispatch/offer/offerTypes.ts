export type OfferStatus = "idle" | "pending" | "accepted" | "expired" | "rejected";

export type OfferState = {
  status: OfferStatus;
  attemptId?: string | number;
  orderId: number;
  driverId: number;
  offeredAt?: string; // ISO
  expiresAt?: string; // ISO
  resolvedAt?: string; // ISO
  note?: string;
};

export type OfferMap = Record<number /*orderId*/, OfferState>;
