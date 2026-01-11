import type { MerchantOrder } from "./types";

export type MerchantLaneId = "new" | "accepted" | "preparing" | "ready" | "done";

export function normLower(v: any): string {
  return String(v ?? "").trim().toLowerCase();
}

export function isPaperOrder(o: MerchantOrder): boolean {
  return !!o?.requires_quote_confirmation && normLower(o?.request_kind) !== "";
}

export function safeParseAttachments(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) return j;
    } catch {
      // ignore
    }
  }
  return [];
}

export function attachmentsCount(o: MerchantOrder): number {
  return safeParseAttachments((o as any)?.request_attachments).length;
}

export function laneForOrder(o: MerchantOrder): MerchantLaneId {
  const st = normLower(o?.store_status);
  if (st === "accepted") return "accepted";
  if (st === "preparing") return "preparing";
  if (st === "ready") return "ready";

  const status = normLower(o?.status);
  if (status === "cancelled" || status === "completed") return "done";

  return "new";
}

export function isPaid(o: MerchantOrder): boolean {
  const ps = normLower(o?.payment_status);
  return ps === "captured" || ps === "verified" || ps === "paid";
}

export function canMoveToLane(o: MerchantOrder, target: MerchantLaneId): { ok: boolean; reason?: string } {
  const status = normLower(o?.status);
  if (status === "cancelled" || status === "completed") {
    return { ok: false, reason: "Order is already closed." };
  }

  // Anything beyond 'accepted' is “work in progress”. Gate by payment/quote.
  if (target === "preparing" || target === "ready") {
    // Paper/pharmacy orders must be quoted + confirmed by customer first.
    if (isPaperOrder(o)) {
      const qs = normLower(o?.quote_status);
      if (qs !== "accepted" && !isPaid(o)) {
        return { ok: false, reason: "Waiting for customer to confirm the quote." };
      }
      // Also require attachment for safety.
      if (attachmentsCount(o) <= 0) {
        return { ok: false, reason: "Attachment required (prescription/notes)." };
      }
    }

    const pm = normLower(o?.payment_method);
    if (pm === "gcash_qr" && !isPaid(o)) {
      return { ok: false, reason: "Waiting for GCash payment verification." };
    }

    if (pm === "wallet" && !isPaid(o)) {
      return { ok: false, reason: "Waiting for wallet payment capture." };
    }
  }

  return { ok: true };
}

// Simple lane SLA budgets (seconds)
export const LANE_SLA_SECONDS: Record<MerchantLaneId, number> = {
  new: 120, // accept within 2 min
  accepted: 300, // start prep within 5 min
  preparing: 900, // ready within 15 min
  ready: 1800, // ideally dispatched quickly
  done: 0,
};

export function slaLevel(lane: MerchantLaneId, ageSeconds: number): "ok" | "warn" | "danger" {
  const budget = LANE_SLA_SECONDS[lane] ?? 0;
  if (!budget) return "ok";
  if (ageSeconds <= budget) return "ok";
  if (ageSeconds <= budget * 1.5) return "warn";
  return "danger";
}
