import { apiFetch } from "@/lib/http";
import type { Paginated } from "@/features/dispatch/api/opsApi";

function qs(params: Record<string, any>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ---- Overview ----
export type SupportOverviewResponse = {
  ok: boolean;
  time?: string;
};

export async function supportOverview(token: string): Promise<SupportOverviewResponse> {
  return apiFetch<SupportOverviewResponse>(`/support/overview`, { method: "GET", token });
}

// ---- Disputes (Trust Layer v1) ----
export type SupportDisputeRow = {
  id: number;
  delivery_order_id: number;
  status: string;
  reason_code: string;
  opened_at?: string | null;
  resolved_at?: string | null;
  evidence_count?: number;
};

export type SupportDisputeEvidence = {
  id: number;
  kind: string;
  note?: string;
  file_mime?: string;
  file_size?: number;
  file_url?: string | null;
  meta?: any;
  created_at?: string | null;
};

export type SupportDisputeDetail = {
  id: number;
  delivery_order_id: number;
  status: string;
  reason_code: string;
  description?: string;
  message?: string;
  opened_at?: string | null;
  resolved_at?: string | null;
  resolved_by_user_id?: number;
  resolution_kind?: string;
  resolution_meta?: any;
  order?: {
    id: number;
    status?: string;
    customer_id?: number;
    driver_id?: number;
    store_id?: number;
  } | null;
  evidence?: SupportDisputeEvidence[];
};

export async function supportListDisputes(
  token: string,
  params?: { status?: string; order_id?: number; customer_id?: number; limit?: number; page?: number }
): Promise<Paginated<SupportDisputeRow>> {
  return apiFetch<Paginated<SupportDisputeRow>>(
    `/support/disputes${qs({ limit: 20, page: 1, ...params })}`,
    { method: "GET", token }
  );
}

export async function supportGetDispute(token: string, id: number): Promise<{ dispute: SupportDisputeDetail }> {
  return apiFetch(`/support/disputes/${id}`, { method: "GET", token });
}

export type SupportResolveDisputePayload = {
  outcome: "refund" | "reject" | "penalty_driver" | "penalty_merchant";
  note?: string;
  refund_points?: number;
  penalty_driver_points?: number;
  penalty_merchant_points?: number;
  meta?: Record<string, any>;
};

export async function supportResolveDispute(token: string, id: number, payload: SupportResolveDisputePayload): Promise<any> {
  return apiFetch(`/support/disputes/${id}/resolve`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

// ---- Orders (Support read) ----
export async function supportListOrders(
  token: string,
  params?: { status?: string; q?: string; store_id?: number; driver_id?: number; customer_id?: number; page?: number; per_page?: number }
): Promise<Paginated<any>> {
  return apiFetch(`/support/orders${qs({ per_page: 20, page: 1, ...params })}`, { method: "GET", token });
}

export async function supportNoteOrder(token: string, orderId: number, note: string): Promise<{ ok: boolean }>{
  return apiFetch(`/support/orders/${orderId}/note`, {
    method: "POST",
    token,
    body: JSON.stringify({ note }),
  });
}

// Generic order detail (works for support without relying on missing controller methods)
export async function getDeliveryOrder(token: string, orderId: number): Promise<any> {
  return apiFetch(`/delivery-orders/${orderId}`, { method: "GET", token });
}

// ---- Users ----
export async function supportSearchUsers(
  token: string,
  params?: { q?: string; role?: string; page?: number; per_page?: number }
): Promise<Paginated<any>> {
  return apiFetch(`/support/users/search${qs({ per_page: 20, page: 1, ...params })}`, { method: "GET", token });
}

export async function supportGetUser(token: string, userId: number): Promise<{ user: any; recent_orders: any[] }>{
  return apiFetch(`/support/users/${userId}`, { method: "GET", token });
}

// ---- AI Assist ----
export type SupportAiAssistRequest = {
  message: string;
  customer_id?: number;
  order_id?: number;
  conversation_id?: string;
  channel?: string;
  locale?: string;
  create_ticket?: boolean;
  ticket?: {
    subject?: string;
    priority?: string;
    category?: string;
    tags?: string[];
    meta?: Record<string, any>;
  };
  ai?: {
    temperature?: number;
    max_output_tokens?: number;
  };
};

export type SupportAiAssistResponse = {
  answer?: string;
  handoff_required?: boolean;
  kb_sources?: Array<{
    article_id?: number;
    title?: string;
    score?: number;
    excerpt?: string;
  }>;
  order_snapshot?: any;
  ticket?: any;
  ai_meta?: any;
  rid?: string;
};

export async function supportAiAssist(
  token: string,
  payload: SupportAiAssistRequest
): Promise<SupportAiAssistResponse> {
  return apiFetch(`/support/ai/assist`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

// ---- KB Articles ----
export type SupportKbArticleRow = {
  id: number;
  title: string;
  category?: string;
  status?: string;
  tags?: string[];
  updated_at?: string;
};

export type SupportKbListResponse = {
  data: SupportKbArticleRow[];
  meta?: { page?: number; per_page?: number; total?: number };
};

export type SupportKbArticleDetail = {
  id: number;
  title: string;
  category?: string;
  status?: string;
  tags?: string[];
  visibility?: string;
  body_md?: string;
  created_at?: string;
  updated_at?: string;
  applies_to?: string[];
  meta?: Record<string, any>;
};

export type SupportKbCreatePayload = {
  title: string;
  category?: string;
  status?: string;
  visibility?: string;
  tags?: string[];
  body_md?: string;
  applies_to?: string[];
  meta?: Record<string, any>;
};

export type SupportKbUpdatePayload = {
  status?: string;
  body_md?: string;
  tags?: string[];
  visibility?: string;
  category?: string;
  title?: string;
  applies_to?: string[];
  meta?: Record<string, any>;
};

export async function supportListKbArticles(
  token: string,
  params?: { status?: string; q?: string; page?: number; per_page?: number }
): Promise<SupportKbListResponse> {
  return apiFetch(`/support/kb/articles${qs({ page: 1, per_page: 20, ...params })}`, {
    method: "GET",
    token,
  });
}

export async function supportGetKbArticle(token: string, articleId: number): Promise<SupportKbArticleDetail> {
  return apiFetch(`/support/kb/articles/${articleId}`, { method: "GET", token });
}

export async function supportCreateKbArticle(
  token: string,
  payload: SupportKbCreatePayload
): Promise<{ id: number; title?: string; status?: string; created_at?: string; updated_at?: string }> {
  return apiFetch(`/support/kb/articles`, { method: "POST", token, body: JSON.stringify(payload) });
}

export async function supportUpdateKbArticle(
  token: string,
  articleId: number,
  payload: SupportKbUpdatePayload
): Promise<{ id: number; status?: string; updated_at?: string }> {
  return apiFetch(`/support/kb/articles/${articleId}`, { method: "PUT", token, body: JSON.stringify(payload) });
}

export async function supportDeleteKbArticle(
  token: string,
  articleId: number
): Promise<{ deleted?: boolean }> {
  return apiFetch(`/support/kb/articles/${articleId}`, { method: "DELETE", token });
}

// ---- Support Tickets ----
export type SupportTicketRow = {
  id: number;
  order_id?: number;
  customer_id?: number;
  subject?: string;
  status?: string;
  priority?: string;
  created_at?: string;
};

export type SupportTicketListResponse = {
  data: SupportTicketRow[];
  meta?: { page?: number; per_page?: number; total?: number };
};

export type SupportTicketDetail = {
  id: number;
  order_id?: number;
  customer_id?: number;
  subject?: string;
  status?: string;
  priority?: string;
  messages?: Array<{
    id?: number;
    type?: string;
    message?: string;
    created_at?: string;
  }>;
  created_at?: string;
  updated_at?: string;
};

export type SupportTicketCreatePayload = {
  order_id?: number;
  customer_id?: number;
  subject: string;
  priority?: string;
  channel?: string;
  message?: string;
  tags?: string[];
  meta?: Record<string, any>;
};

export type SupportTicketMessagePayload = {
  message: string;
  internal_note?: boolean;
  attachments?: Array<{ type: string; url: string }>;
};

export async function supportListTickets(
  token: string,
  params?: { status?: string; order_id?: number; page?: number; per_page?: number }
): Promise<SupportTicketListResponse> {
  return apiFetch(`/support/tickets${qs({ page: 1, per_page: 20, ...params })}`, { method: "GET", token });
}

export async function supportGetTicket(token: string, ticketId: number): Promise<SupportTicketDetail> {
  return apiFetch(`/support/tickets/${ticketId}`, { method: "GET", token });
}

export async function supportCreateTicket(
  token: string,
  payload: SupportTicketCreatePayload
): Promise<{ id: number; status?: string; created_at?: string }> {
  return apiFetch(`/support/tickets`, { method: "POST", token, body: JSON.stringify(payload) });
}

export async function supportAddTicketMessage(
  token: string,
  ticketId: number,
  payload: SupportTicketMessagePayload
): Promise<{ message_id?: number; ticket_id?: number; created_at?: string }> {
  return apiFetch(`/support/tickets/${ticketId}/messages`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}
