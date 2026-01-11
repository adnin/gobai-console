import * as React from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { MerchantTabs } from "@/features/merchant/components/MerchantTabs";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useMerchantOrders } from "../hooks/useMerchantOrders";

import { useMerchantRealtime } from "../hooks/useMerchantRealtime";
import {
  merchantAcceptOrder,
  merchantGetOrder,
  merchantSubmitPaperQuote,
  merchantUpdateOrderStoreStatus,
  merchantGetKpi,
  type MerchantKpiResponse,
  type MerchantOrderLite,
  type MerchantOrderDetails,
  type MerchantQuoteItem,
} from "../api/merchantApi";

import { useNavigate } from "react-router-dom";

import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";

type LaneKey = "new" | "accepted" | "preparing" | "ready";

// When lanes get busy (20–50 orders), switch to a compact density so the board stays scannable.
const DENSE_LANE_THRESHOLD = 12;

const LANES: { key: LaneKey; title: string; hint: string }[] = [
  { key: "new", title: "New", hint: "Needs acceptance" },
  { key: "accepted", title: "Accepted", hint: "Awaiting payment / prep start" },
  { key: "preparing", title: "Preparing", hint: "Being packed / cooked" },
  { key: "ready", title: "Ready", hint: "Handover / dispatch / pickup" },
];

type SlaLevel = "good" | "warn" | "bad";

const LANE_SLA: Record<LaneKey, { budgetSec: number; warnAt: number }> = {
  new: { budgetSec: 180, warnAt: 0.75 },
  accepted: { budgetSec: 120, warnAt: 0.75 },
  preparing: { budgetSec: 15 * 60, warnAt: 0.8 },
  ready: { budgetSec: 0, warnAt: 0.9 },
};

function nowIso() {
  return new Date().toISOString();
}
function isTerminal(o: MerchantOrderLite): boolean {
  const s = String((o as any).status ?? "")
    .toLowerCase()
    .trim();
  return s === "completed" || s === "cancelled" || s === "delivered";
}

function parseISOToMs(v?: string | null): number | null {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

function secSince(iso?: string | null): number {
  const t = parseISOToMs(iso) ?? Date.now();
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

/**
 * ✅ Pickup support:
 * If prep_status says ready_for_pickup, treat as READY lane even if store_status still says preparing.
 */
function laneForOrder(o: MerchantOrderLite): LaneKey {
  const prep = String((o as any).prep_status ?? "")
    .toLowerCase()
    .trim();

  if (prep === "ready_for_pickup" || prep === "ready") return "ready";

  const st = String(o.store_status ?? "new")
    .toLowerCase()
    .trim();

  if (st === "accepted") return "accepted";
  if (st === "preparing") return "preparing";
  if (st === "ready") return "ready";
  return "new";
}

function laneStartAt(o: MerchantOrderLite, lane: LaneKey): string {
  if (lane === "accepted") {
    return (
      o.store_accepted_at ||
      o.updated_at ||
      o.order_time ||
      o.created_at ||
      nowIso()
    );
  }
  if (lane === "preparing") {
    return (
      o.updated_at ||
      o.store_accepted_at ||
      o.order_time ||
      o.created_at ||
      nowIso()
    );
  }
  if (lane === "ready") {
    return (
      o.store_ready_at ||
      o.updated_at ||
      o.order_time ||
      o.created_at ||
      nowIso()
    );
  }
  return o.order_time || o.created_at || o.updated_at || nowIso();
}

function isPaid(o: MerchantOrderLite): boolean {
  const st = String(o.payment_status ?? "unpaid").toLowerCase();
  return st === "captured" || st === "paid" || st === "verified";
}

function isPaperLike(o: MerchantOrderLite): boolean {
  if (o.requires_quote_confirmation) return true;
  const kind = String(o.request_kind ?? "").toLowerCase();
  return kind === "paper" || kind === "pharmacy";
}

function hasAttachments(o: MerchantOrderLite): boolean {
  const arr = Array.isArray(o.request_attachments) ? o.request_attachments : [];
  return arr.length > 0;
}

function prepBudgetSec(o: MerchantOrderLite): number {
  const min = Number(o.prep_time_min ?? 0);
  if (Number.isFinite(min) && min > 0) return Math.floor(min * 60);
  return LANE_SLA.preparing.budgetSec;
}

function slaForOrder(
  o: MerchantOrderLite,
  lane: LaneKey
): { ageSec: number; budgetSec: number; level: SlaLevel } {
  const start = laneStartAt(o, lane);
  const ageSec = secSince(start);
  const budgetSec =
    lane === "preparing" ? prepBudgetSec(o) : LANE_SLA[lane]?.budgetSec ?? 0;

  if (!budgetSec) return { ageSec, budgetSec: 0, level: "good" };
  const pct = ageSec / budgetSec;
  if (pct >= 1) return { ageSec, budgetSec, level: "bad" };
  if (pct >= (LANE_SLA[lane]?.warnAt ?? 0.75))
    return { ageSec, budgetSec, level: "warn" };
  return { ageSec, budgetSec, level: "good" };
}

function fmtMmSs(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function timerLabel(sla: { ageSec: number; budgetSec: number }) {
  if (!sla.budgetSec) return "";
  const rem = sla.budgetSec - sla.ageSec;
  if (rem >= 0) return fmtMmSs(rem);
  return `+${fmtMmSs(Math.abs(rem))}`;
}

function barClasses(level: SlaLevel) {
  if (level === "good") return "bg-[color:var(--success)]";
  if (level === "warn") return "bg-[color:var(--warning)]";
  return "bg-[color:var(--danger)]";
}

function badgeVariant(level: SlaLevel) {
  return level === "good" ? "success" : level === "warn" ? "warning" : "danger";
}

function playChime(kind: "new" | "paid" | "move", volume: number) {
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume));
  master.connect(ctx.destination);

  const seq: number[] =
    kind === "new"
      ? [523.25, 659.25, 783.99]
      : kind === "paid"
      ? [392.0, 523.25, 659.25, 783.99]
      : [659.25, 523.25];

  seq.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + i * 0.12);

    g.gain.setValueAtTime(0.0001, now + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.35, now + i * 0.12 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.12);

    osc.connect(g);
    g.connect(master);

    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.14);
  });

  setTimeout(() => {
    try {
      ctx.close();
    } catch {}
  }, 1000);
}

function requestNotifyPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") return;
  if (Notification.permission === "denied") return;
  void Notification.requestPermission();
}

function notify(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {}
}

function parseLaneDropId(id: string): LaneKey | null {
  if (!id) return null;
  const [kind, raw] = id.split(":");
  if (kind !== "lane") return null;
  const v = raw as LaneKey;
  return (LANES.find((l) => l.key === v)?.key ?? null) as any;
}

function parseOrderDragId(id: string): number | null {
  if (!id) return null;
  const [kind, raw] = id.split(":");
  if (kind !== "order") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function canMoveToPreparing(o: MerchantOrderLite): {
  ok: boolean;
  reason?: string;
} {
  if (laneForOrder(o) !== "accepted")
    return { ok: false, reason: "Not in Accepted" };

  if (isPaperLike(o)) {
    if (!hasAttachments(o))
      return { ok: false, reason: "Needs attachments (paper/pharma)" };
    if (!isPaid(o)) return { ok: false, reason: "Awaiting quote/payment" };
    return { ok: true };
  }

  if (!isPaid(o)) return { ok: false, reason: "Awaiting payment" };
  return { ok: true };
}

function canMoveToReady(o: MerchantOrderLite): {
  ok: boolean;
  reason?: string;
} {
  const lane = laneForOrder(o);
  if (lane !== "preparing" && lane !== "accepted")
    return { ok: false, reason: "Not preparing" };
  if (!isPaid(o)) return { ok: false, reason: "Awaiting payment" };
  if (isPaperLike(o) && !hasAttachments(o))
    return { ok: false, reason: "Needs attachments" };
  return { ok: true };
}

function Toggle({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition",
        value
          ? "border-foreground/20 bg-foreground text-background"
          : "border-border bg-card text-foreground hover:bg-accent"
      )}
      aria-pressed={value}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function Toast({
  kind,
  text,
  onClose,
}: {
  kind: "ok" | "warn" | "err";
  text: string;
  onClose: () => void;
}) {
  const icon =
    kind === "ok" ? (
      <CheckCircle2 className="size-4" />
    ) : kind === "warn" ? (
      <AlertTriangle className="size-4" />
    ) : (
      <AlertTriangle className="size-4" />
    );

  return (
    <div
      className={cn(
        "pointer-events-auto flex max-w-sm items-start gap-2 rounded-xl border p-3 shadow-lg",
        kind === "ok"
          ? "border-[color:var(--success)]/30 bg-[color:var(--success)]/10"
          : kind === "warn"
          ? "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10"
          : "border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10"
      )}
      role="status"
    >
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-tight">{text}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Drag between lanes to update status.
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="-mr-1 -mt-1"
        onClick={onClose}
      >
        <span className="sr-only">Close</span>✕
      </Button>
    </div>
  );
}

function Lane({
  lane,
  orders,
  highlight,
  dense,
  children,
}: {
  lane: (typeof LANES)[number];
  orders: MerchantOrderLite[];
  highlight?: boolean;
  dense?: boolean;
  children: React.ReactNode;
}) {
  const id = `lane:${lane.key}`;
  const { setNodeRef, isOver } = useDroppable({ id });

  const worst = React.useMemo(() => {
    if (!orders.length) return { level: "good" as SlaLevel, pct: 0 };

    let worstPct = 0;
    let worstLevel: SlaLevel = "good";

    for (const o of orders) {
      const sla = slaForOrder(o, lane.key);
      if (!sla.budgetSec) continue;
      const pct = sla.ageSec / sla.budgetSec;
      if (pct > worstPct) {
        worstPct = pct;
        worstLevel = sla.level;
      }
    }

    return { level: worstLevel, pct: Math.min(1.15, worstPct) };
  }, [orders, lane.key]);

  const budgetText = React.useMemo(() => {
    const base = LANE_SLA[lane.key]?.budgetSec ?? 0;
    if (!base) return "";
    return fmtMmSs(base);
  }, [lane.key]);

  return (
    <div className="flex min-w-[300px] flex-1 min-h-0 flex-col gap-2">
      <div
        className={cn(
          dense
            ? "rounded-2xl border border-border bg-card p-2"
            : "rounded-2xl border border-border bg-card p-2.5",
          isOver && "border-foreground/25 bg-accent",
          highlight && "merchant-lane-flash"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">{lane.title}</div>
              <Badge variant="secondary" className="text-[11px]">
                {orders.length}
              </Badge>
            </div>
            {!dense ? (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {lane.hint}
              </div>
            ) : null}
          </div>

          {budgetText ? (
            <div className="text-xs text-muted-foreground">
              SLA {budgetText}
            </div>
          ) : null}
        </div>

        {budgetText && !dense ? (
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  barClasses(worst.level)
                )}
                style={{
                  width: `${Math.round(Math.min(1, worst.pct) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{worst.pct >= 1 ? "Overdue" : "On track"}</span>
              <span>{`${Math.round(worst.pct * 100)}%`}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          dense
            ? "flex-1 min-h-0 rounded-2xl border border-border bg-background/50 p-1.5 overflow-y-auto overscroll-contain"
            : "flex-1 min-h-0 rounded-2xl border border-border bg-background/50 p-2 overflow-y-auto overscroll-contain",
          isOver && "border-foreground/25 bg-accent/40"
        )}
      >
        <div className={cn("space-y-2", dense && "space-y-1.5")}>
          {children}
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  nowTick,
  isNew,
  dense,
  onOpen,
}: {
  order: MerchantOrderLite;
  nowTick: number;
  isNew: boolean;
  dense: boolean;
  onOpen: (o: MerchantOrderLite) => void;
}) {
  const lane = laneForOrder(order);
  const { ageSec, budgetSec, level } = slaForOrder(order, lane);
  void nowTick;

  const id = `order:${order.id}`;
  const { setNodeRef, attributes, listeners, transform, isDragging } =
    useDraggable({ id });

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : {};

  const paid = isPaid(order);
  const paper = isPaperLike(order);

  const badgeDenseClass = dense ? "h-5 px-2 py-0 text-[10px]" : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-70")}
    >
      <Card
        className={cn(
          "cursor-grab select-none rounded-2xl border-border",
          isNew && "merchant-card-new",
          isDragging && "shadow-xl"
        )}
        onDoubleClick={() => onOpen(order)}
      >
        <CardHeader
          className={cn(dense ? "space-y-1 p-2" : "space-y-1.5 p-2.5")}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {order.reference_no
                  ? `#${order.reference_no}`
                  : `Order #${order.id}`}
              </div>
              {!dense ? (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {String(order.flow_type ?? "store")} •{" "}
                  {String(order.status ?? "pending")}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              {budgetSec ? (
                <Badge
                  variant={badgeVariant(level) as any}
                  className={cn("gap-1", badgeDenseClass)}
                >
                  <Clock className="size-3" />
                  {timerLabel({ ageSec, budgetSec })}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge
              variant={paid ? "success" : "secondary"}
              className={cn("gap-1", badgeDenseClass)}
            >
              {paid ? (
                <ShieldCheck className="size-3" />
              ) : (
                <Clock className="size-3" />
              )}
              {paid
                ? "Paid"
                : dense
                ? "Unpaid"
                : String(order.payment_status ?? "unpaid")}
            </Badge>

            {!dense ? (
              <Badge variant="outline" className={cn("gap-1", badgeDenseClass)}>
                {String(order.payment_method ?? "—")}
              </Badge>
            ) : null}

            {paper ? (
              <Badge
                variant={hasAttachments(order) ? "secondary" : "danger"}
                className={cn("gap-1", badgeDenseClass)}
              >
                <AlertTriangle className="size-3" />
                {hasAttachments(order) ? "Paper/Pharma" : "Needs attachment"}
              </Badge>
            ) : null}

            {String((order as any).prep_status ?? "").toLowerCase() ===
            "ready_for_pickup" ? (
              <Badge
                variant="secondary"
                className={cn("gap-1", badgeDenseClass)}
              >
                Pickup ready
              </Badge>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className={cn(dense ? "p-2 pt-0" : "p-2.5 pt-0")}>
          <div className="flex items-center justify-between gap-2">
            {!dense ? (
              <div className="text-xs text-muted-foreground">
                Drag to update
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-full",
                  dense ? "h-6 px-2 text-xs" : "h-7 px-3"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpen(order);
                }}
              >
                Details
              </Button>

              <div
                {...attributes}
                {...listeners}
                className={cn(
                  "rounded-full border border-border bg-card text-xs text-muted-foreground",
                  dense ? "px-2 py-0.5" : "px-3 py-1"
                )}
                title="Drag"
              >
                ⋮⋮
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ✅ Full updated DetailsModal (drop-in replacement)
// - Adds "Mark picked up" action (merchantPickupComplete) when lane is READY
// - Shows "Picked up" badge when prep_status === "picked_up"
// - Keeps your quote flow + attachments viewer + items panel intact
// - Reuses your existing helpers: cn, isPaid, isPaperLike, hasAttachments, laneForOrder, slaForOrder, timerLabel

function DetailsModal({
  order,
  onClose,
  onToast,
}: {
  order: MerchantOrderLite;
  onClose: () => void;
  onToast: (t: { kind: "ok" | "warn" | "err"; text: string }) => void;
}) {
  const { token } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["merchant-order", Number(order.id)],
    queryFn: async () => merchantGetOrder(token, Number(order.id)),
    enabled: !!token && !!order?.id,
  });

  const details =
    (q.data as MerchantOrderDetails | undefined) ?? (order as any);

  const API_BASE =
    (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000/api";
  const PUBLIC_BASE = String(API_BASE).replace(/\/api\/?$/, "");

  function resolveUrl(u?: string | null): string | null {
    if (!u) return null;
    const s = String(u);
    if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return s;
    if (s.startsWith("/")) return `${PUBLIC_BASE}${s}`;
    return `${PUBLIC_BASE}/${s}`;
  }

  function isImage(att: any): boolean {
    const mime = String(att?.mime ?? "").toLowerCase();
    if (mime.startsWith("image/")) return true;
    const url = String(att?.url ?? "").toLowerCase();
    return [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) =>
      url.endsWith(ext)
    );
  }

  function isPdf(att: any): boolean {
    const mime = String(att?.mime ?? "").toLowerCase();
    if (mime.includes("pdf")) return true;
    const url = String(att?.url ?? "").toLowerCase();
    return url.endsWith(".pdf");
  }

  const attachments = Array.isArray((details as any).request_attachments)
    ? ((details as any).request_attachments as any[])
    : [];

  const orderItems = Array.isArray((details as any)?.items)
    ? ((details as any).items as any[])
    : [];

  const itemsSubtotal = React.useMemo(() => {
    return orderItems.reduce((sum, it) => {
      const lt = Number(it?.line_total ?? 0);
      return sum + (Number.isFinite(lt) ? lt : 0);
    }, 0);
  }, [orderItems]);

  const paid = isPaid(details as any);
  const paper = isPaperLike(details as any);

  const lane = laneForOrder(details as any);
  const sla = slaForOrder(details as any, lane);
  const slaText = sla.budgetSec ? timerLabel(sla) : "";
  const slaChipVariant =
    sla.level === "good"
      ? "success"
      : sla.level === "warn"
      ? "warning"
      : "danger";

  // -----------------------------
  // ✅ Quote editor state
  // -----------------------------
  const [items, setItems] = React.useState<MerchantQuoteItem[]>([
    { name: "", qty: 1, unit_price: 0, notes: "" },
  ]);
  const [pharmacistNotes, setPharmacistNotes] = React.useState<string>("");
  const [partialFillAllowed, setPartialFillAllowed] =
    React.useState<boolean>(false);
  const [partialFillNotes, setPartialFillNotes] = React.useState<string>("");

  const initRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    const d = q.data as MerchantOrderDetails | undefined;
    if (!d) return;

    const oid = Number(order.id);
    if (!oid) return;
    if (initRef.current === oid) return;
    initRef.current = oid;

    const qp: any = d.quote_payload ?? null;
    const qpItems: any[] = Array.isArray(qp?.items) ? qp.items : [];

    const nextItems: MerchantQuoteItem[] = qpItems.length
      ? qpItems.map((it: any) => ({
          name: String(it?.name ?? ""),
          qty: Number(it?.qty ?? 1) || 1,
          unit_price: Number(it?.unit_price ?? it?.price ?? 0) || 0,
          notes: it?.notes ? String(it.notes) : "",
        }))
      : [{ name: "", qty: 1, unit_price: 0, notes: "" }];

    setItems(nextItems);
    setPharmacistNotes(String(qp?.pharmacist_notes ?? ""));
    setPartialFillAllowed(
      Boolean(qp?.allow_partial_fill ?? qp?.partial_fill_allowed ?? false)
    );
    setPartialFillNotes(String(qp?.partial_fill_notes ?? ""));
  }, [q.data, order.id]);

  const subtotal = React.useMemo(() => {
    return items.reduce((sum, it: any) => {
      const qty = Number(it.qty ?? 0) || 0;
      const unit = Number(it.unit_price ?? 0) || 0;
      return sum + qty * unit;
    }, 0);
  }, [items]);

  const canSubmitQuote = React.useMemo(() => {
    if (!paper) return false;
    if (!attachments.length) return false;
    const valid = items.some(
      (it: any) =>
        String(it.name ?? "").trim().length > 0 && (Number(it.qty) || 0) > 0
    );
    return valid;
  }, [paper, attachments.length, items]);

  const quoteM = useMutation({
    mutationFn: async (payload: any) => {
      return merchantSubmitPaperQuote(token, Number(order.id), payload);
    },
    onSuccess: () => {
      onToast({
        kind: "ok",
        text: "Quote sent. Customer can now confirm & pay.",
      });
      qc.invalidateQueries({ queryKey: ["merchant-orders"] });
      qc.invalidateQueries({ queryKey: ["merchant-order", Number(order.id)] });
    },
  });

  async function submitQuote() {
    if (!canSubmitQuote) {
      onToast({
        kind: "warn",
        text: "Add at least 1 item and ensure attachments exist.",
      });
      return;
    }

    const cleaned = (items as any[])
      .map((it) => ({
        name: String(it.name ?? "").trim(),
        qty: Math.max(1, Number(it.qty ?? 1) || 1),
        unit_price: Math.max(0, Number(it.unit_price ?? 0) || 0),
        notes: String(it.notes ?? "").trim() || undefined,
      }))
      .filter((it) => it.name.length > 0);

    if (!cleaned.length) {
      onToast({ kind: "warn", text: "At least 1 valid item is required." });
      return;
    }

    try {
      await quoteM.mutateAsync({
        items: cleaned,
        pharmacist_notes: pharmacistNotes.trim() || undefined,
        allow_partial_fill: partialFillAllowed,
        partial_fill_notes: partialFillNotes.trim() || undefined,
      });
    } catch (e: any) {
      onToast({ kind: "err", text: e?.message ?? "Failed to submit quote" });
    }
  }

  // -----------------------------
  // ✅ Actions: accept / status moves / pickup handover
  // -----------------------------
  const acceptM = useMutation({
    mutationFn: async () => merchantAcceptOrder(token, Number(order.id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merchant-orders"] });
      qc.invalidateQueries({ queryKey: ["merchant-order", Number(order.id)] });
      onToast({ kind: "ok", text: "Order accepted." });
    },
  });

  const statusM = useMutation({
    mutationFn: async (to: "accepted" | "preparing" | "ready") => {
      return merchantUpdateOrderStoreStatus(token, Number(order.id), to);
    },
    onSuccess: (_d, to) => {
      qc.invalidateQueries({ queryKey: ["merchant-orders"] });
      qc.invalidateQueries({ queryKey: ["merchant-order", Number(order.id)] });
      onToast({ kind: "ok", text: `Moved to ${to}.` });
    },
  });

  // ✅ requires you to add merchantCompletePickup() in merchantApi.ts (see patch above)
  const pickupM = useMutation({
    mutationFn: async () => {
      const { merchantCompletePickup } = await import("../api/merchantApi");
      return merchantCompletePickup(token, Number(order.id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merchant-orders"] });
      qc.invalidateQueries({ queryKey: ["merchant-order", Number(order.id)] });
      onToast({ kind: "ok", text: "Pickup confirmed (handover complete)." });
    },
  });

  const storeStatus = String(
    (details as any).store_status ?? "new"
  ).toLowerCase();
  const prepStatus = String(
    (details as any).prep_status ?? "none"
  ).toLowerCase();
  const lifeStatus = String((details as any).status ?? "pending").toLowerCase();

  const canAccept = storeStatus === "new" && !acceptM.isPending;
  const gatePrep = canMoveToPreparing(details as any);
  const canStartPreparing =
    storeStatus === "accepted" && gatePrep.ok && !statusM.isPending;

  const gateReady = canMoveToReady(details as any);
  const canMarkReady =
    (storeStatus === "preparing" || storeStatus === "accepted") &&
    gateReady.ok &&
    !statusM.isPending;

  // ✅ pickup/handover: only when merchant has made it ready (or prep says ready_for_pickup),
  // and order is at least accepted, and not cancelled/completed.
  const canConfirmPickup =
    !pickupM.isPending &&
    (storeStatus === "ready" || prepStatus === "ready_for_pickup") &&
    !["cancelled", "completed"].includes(lifeStatus);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "flex w-[95vw] max-w-none",
          "h-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]",
          "flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        )}
      >
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex items-start justify-between gap-2 p-3 sm:p-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold">
                {details.reference_no
                  ? `Order #${details.reference_no}`
                  : `Order #${details.id}`}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {String(details.flow_type ?? "store")} •{" "}
                {String(details.status ?? "pending")}
                {q.isLoading ? " • loading…" : ""}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant={paid ? "success" : "secondary"}
                  className="gap-1"
                >
                  {paid ? (
                    <ShieldCheck className="size-3" />
                  ) : (
                    <Clock className="size-3" />
                  )}
                  {paid ? "Paid" : String(details.payment_status ?? "unpaid")}
                </Badge>

                <Badge variant="outline" className="gap-1">
                  {String(details.payment_method ?? "—")}
                </Badge>

                <Badge variant="secondary" className="gap-1">
                  Store: {String((details as any).store_status ?? "new")}
                </Badge>

                {String((details as any).prep_status ?? "").toLowerCase() ===
                "ready_for_pickup" ? (
                  <Badge variant="secondary" className="gap-1">
                    Pickup: ready
                  </Badge>
                ) : null}

                {paper ? (
                  <Badge
                    variant={attachments.length ? "warning" : "danger"}
                    className="gap-1"
                  >
                    <AlertTriangle className="size-3" />
                    {attachments.length ? "Paper/Pharma" : "Needs attachment"}
                  </Badge>
                ) : null}

                {paper ? (
                  <Badge variant="outline" className="gap-1">
                    Quote: {String((details as any).quote_status ?? "—")}
                  </Badge>
                ) : null}

                {slaText ? (
                  <Badge variant={slaChipVariant as any} className="gap-1">
                    <Clock className="size-3" />
                    {slaText}
                  </Badge>
                ) : null}

                {Number.isFinite(Number((details as any).total_price)) ? (
                  <Badge variant="secondary" className="gap-1">
                    Total: ₱{Number((details as any).total_price).toFixed(2)}
                  </Badge>
                ) : null}
              </div>

              {/* ✅ Action row */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {canAccept ? (
                  <Button
                    className="h-8 rounded-full"
                    onClick={() => acceptM.mutate()}
                    disabled={acceptM.isPending}
                  >
                    {acceptM.isPending ? "Accepting…" : "Accept"}
                  </Button>
                ) : null}

                {canStartPreparing ? (
                  <Button
                    variant="outline"
                    className="h-8 rounded-full"
                    onClick={() => statusM.mutate("preparing")}
                    disabled={statusM.isPending}
                  >
                    Start preparing
                  </Button>
                ) : null}

                {storeStatus !== "ready" && canMarkReady ? (
                  <Button
                    variant="outline"
                    className="h-8 rounded-full"
                    onClick={() => statusM.mutate("ready")}
                    disabled={statusM.isPending}
                  >
                    Mark ready
                  </Button>
                ) : null}

                {canConfirmPickup ? (
                  <Button
                    className="h-8 rounded-full"
                    onClick={() => pickupM.mutate()}
                    disabled={pickupM.isPending}
                  >
                    {pickupM.isPending
                      ? "Confirming…"
                      : "Confirm pickup / handover"}
                  </Button>
                ) : null}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">Attachments</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Prescription / request image / document.
                    </div>
                  </div>
                  {attachments.length ? (
                    <Badge variant="secondary">{attachments.length}</Badge>
                  ) : (
                    <Badge variant="danger">Missing</Badge>
                  )}
                </div>

                {attachments.length ? (
                  <PhotoProvider>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {attachments.map((att, idx) => {
                        const thumb = resolveUrl(att?.thumb_url ?? att?.url);
                        const full = resolveUrl(att?.url);
                        const name = String(
                          att?.name ?? `Attachment ${idx + 1}`
                        );

                        const canInspect =
                          !!full && isImage(att) && !isPdf(att);

                        if (!canInspect) {
                          return (
                            <button
                              key={`${name}-${idx}`}
                              type="button"
                              className="group overflow-hidden rounded-xl border border-border bg-card text-left"
                              onClick={() => {
                                if (full)
                                  window.open(
                                    full,
                                    "_blank",
                                    "noopener,noreferrer"
                                  );
                              }}
                            >
                              <div className="aspect-[4/3] w-full overflow-hidden bg-black/5">
                                <div className="flex h-full w-full items-center justify-center">
                                  <div className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                                    {isPdf(att) ? "PDF" : "File"}
                                  </div>
                                </div>
                              </div>
                              <div className="p-2">
                                <div className="truncate text-xs font-medium">
                                  {name}
                                </div>
                                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  {String(att?.mime ?? "") || "click to open"}
                                </div>
                              </div>
                            </button>
                          );
                        }

                        return (
                          <PhotoView key={`${name}-${idx}`} src={full!}>
                            <button
                              type="button"
                              className="group overflow-hidden rounded-xl border border-border bg-card text-left"
                              title="Click to inspect (zoom/pan)"
                            >
                              <div className="aspect-[4/3] w-full overflow-hidden bg-black/5">
                                <img
                                  src={thumb ?? full!}
                                  alt={name}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                                  loading="lazy"
                                />
                              </div>
                              <div className="p-2">
                                <div className="truncate text-xs font-medium">
                                  {name}
                                </div>
                                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  Click to zoom • scroll/pinch
                                </div>
                              </div>
                            </button>
                          </PhotoView>
                        );
                      })}
                    </div>
                  </PhotoProvider>
                ) : (
                  <div className="mt-2 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                    No attachments on this order yet.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">Items</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Qty × price • totals from order items.
                    </div>
                  </div>
                  <Badge variant="secondary">{orderItems.length}</Badge>
                </div>

                {orderItems.length ? (
                  <div className="mt-3 space-y-2">
                    {orderItems.map((it, idx) => {
                      const name = String(
                        it?.name_snapshot ?? it?.name ?? `Item ${idx + 1}`
                      );
                      const qty = Number(it?.qty ?? 0) || 0;
                      const price =
                        Number(
                          it?.price_snapshot ?? it?.unit_price ?? it?.price ?? 0
                        ) || 0;
                      const lineTotal =
                        Number(it?.line_total ?? qty * price) || 0;

                      return (
                        <div
                          key={String(it?.id ?? idx)}
                          className="rounded-xl border border-border bg-card p-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">
                                {name}
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                Qty {qty} • ₱{price.toFixed(2)}
                              </div>
                              {it?.notes ? (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Notes: {String(it.notes)}
                                </div>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-sm font-semibold">
                              ₱{lineTotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-card p-2.5">
                      <div className="text-xs text-muted-foreground">
                        Items total
                      </div>
                      <div className="text-sm font-semibold">
                        ₱{itemsSubtotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                    No items found on this order yet.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-background p-3">
                <div className="text-sm font-semibold">Rules</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Accept anytime. Moving to Preparing/Ready stays blocked until
                  payment is confirmed. Paper/Pharma needs attachments, then
                  submit a quote so the customer can confirm & pay. Confirm
                  pickup marks merchant handover (does not “complete” the whole
                  order).
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">
                    Paper/Pharma Quote
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Add items + unit price, then submit. Customer will confirm
                    and pay in the app.
                  </div>
                </div>
                {paper ? (
                  <Badge variant="warning">Quote flow</Badge>
                ) : (
                  <Badge variant="secondary">Not needed</Badge>
                )}
              </div>

              {!paper ? (
                <div className="mt-3 text-sm text-muted-foreground">
                  This order doesn’t require paper/pharmacy quoting.
                </div>
              ) : (
                <>
                  <div className="mt-3 max-h-[40vh] overflow-y-auto pr-1">
                    <div className="space-y-2">
                      {(items as any[]).map((it, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-border bg-card p-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="grid gap-2 sm:grid-cols-12">
                                <div className="sm:col-span-7">
                                  <div className="text-[11px] text-muted-foreground">
                                    Item
                                  </div>
                                  <input
                                    value={it.name}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setItems((prev: any) => {
                                        const next = [...prev];
                                        next[i] = { ...next[i], name: v };
                                        return next;
                                      });
                                    }}
                                    className="mt-1 h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                                    placeholder="e.g., Amoxicillin 500mg"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <div className="text-[11px] text-muted-foreground">
                                    Qty
                                  </div>
                                  <input
                                    type="number"
                                    min={1}
                                    value={it.qty}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setItems((prev: any) => {
                                        const next = [...prev];
                                        next[i] = {
                                          ...next[i],
                                          qty: Number.isFinite(v) ? v : 1,
                                        };
                                        return next;
                                      });
                                    }}
                                    className="mt-1 h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                                  />
                                </div>

                                <div className="sm:col-span-3">
                                  <div className="text-[11px] text-muted-foreground">
                                    Unit price
                                  </div>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={it.unit_price}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setItems((prev: any) => {
                                        const next = [...prev];
                                        next[i] = {
                                          ...next[i],
                                          unit_price: Number.isFinite(v)
                                            ? v
                                            : 0,
                                        };
                                        return next;
                                      });
                                    }}
                                    className="mt-1 h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                                  />
                                </div>
                              </div>

                              <div className="mt-2">
                                <div className="text-[11px] text-muted-foreground">
                                  Notes (optional)
                                </div>
                                <input
                                  value={String(it.notes ?? "")}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setItems((prev: any) => {
                                      const next = [...prev];
                                      next[i] = { ...next[i], notes: v };
                                      return next;
                                    });
                                  }}
                                  className="mt-1 h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                                  placeholder="Brand preference, dosage notes"
                                />
                              </div>

                              <div className="mt-2 flex items-center justify-between text-xs">
                                <div className="text-muted-foreground">
                                  Line total
                                </div>
                                <div className="font-semibold">
                                  ₱
                                  {(
                                    Number(it.qty ?? 0) *
                                    Number(it.unit_price ?? 0)
                                  ).toFixed(2)}
                                </div>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-full px-2"
                              onClick={() =>
                                setItems((prev: any) =>
                                  prev.filter(
                                    (_: any, idx: number) => idx !== i
                                  )
                                )
                              }
                              title="Remove"
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      className="h-8 rounded-full px-3"
                      onClick={() =>
                        setItems((prev: any) => [
                          ...prev,
                          { name: "", qty: 1, unit_price: 0, notes: "" },
                        ])
                      }
                    >
                      + Add item
                    </Button>

                    <div className="text-sm font-semibold">
                      Subtotal: ₱{subtotal.toFixed(2)}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Pharmacist / Store notes (optional)
                      </div>
                      <textarea
                        value={pharmacistNotes}
                        onChange={(e) => setPharmacistNotes(e.target.value)}
                        className="mt-1 min-h-[64px] w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                        placeholder="Important notes for the customer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-muted-foreground">
                          Partial fill
                        </div>
                        <button
                          type="button"
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs",
                            partialFillAllowed
                              ? "border-foreground/20 bg-foreground text-background"
                              : "border-border bg-card text-foreground hover:bg-accent"
                          )}
                          onClick={() => setPartialFillAllowed((v) => !v)}
                        >
                          {partialFillAllowed ? "Allowed" : "Not allowed"}
                        </button>
                      </div>
                      <textarea
                        value={partialFillNotes}
                        onChange={(e) => setPartialFillNotes(e.target.value)}
                        className="mt-2 min-h-[64px] w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                        placeholder="If allowed, add details (optional)"
                      />
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-border bg-card p-3">
                    {!attachments.length ? (
                      <div className="text-sm text-muted-foreground">
                        Cannot submit quote: attachments are missing.
                      </div>
                    ) : null}

                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-muted-foreground">
                        After submit: customer can confirm. Dispatch may remain
                        blocked until confirmed.
                      </div>
                      <Button
                        className="h-9 rounded-full"
                        onClick={submitQuote}
                        disabled={!canSubmitQuote || quoteM.isPending}
                      >
                        {quoteM.isPending ? "Submitting…" : "Submit quote"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <Separator />
            <div className="mt-2 text-xs text-muted-foreground">
              Tip: You can keep this modal open while orders update in
              real-time.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MerchantHomePage() {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const qc = useQueryClient();
  const { token } = useAuth();
  const nav = useNavigate();

  function localYmd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }

  const todayYmd = React.useMemo(() => localYmd(), []);
  const kpiQ = useQuery({
    queryKey: ["merchant-kpi", todayYmd],
    queryFn: async () =>
      merchantGetKpi(token, todayYmd) as Promise<MerchantKpiResponse>,
    enabled: !!token,
    refetchInterval: 30_000,
  });

  useMerchantRealtime();

  const [nowTick, setNowTick] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const [toast, setToast] = React.useState<null | {
    kind: "ok" | "warn" | "err";
    text: string;
  }>(null);
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const [details, setDetails] = React.useState<MerchantOrderLite | null>(null);

  const [autoPrepareOnPaid, setAutoPrepareOnPaid] = React.useState<boolean>(
    () => {
      try {
        return (
          window.localStorage.getItem("merchant.board.autoPrepareOnPaid") ===
          "1"
        );
      } catch {
        return true;
      }
    }
  );

  const [soundOn, setSoundOn] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem("merchant.board.soundOn") !== "0";
    } catch {
      return true;
    }
  });

  const [volume, setVolume] = React.useState<number>(() => {
    try {
      const raw = window.localStorage.getItem("merchant.board.volume");
      const v = raw ? Number(raw) : 0.55;
      return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.55;
    } catch {
      return 0.55;
    }
  });

  const [notifOn, setNotifOn] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem("merchant.board.notifOn") === "1";
    } catch {
      return false;
    }
  });

  const [headerHidden, setHeaderHidden] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem("merchant.board.headerHidden") === "1";
    } catch {
      return false;
    }
  });

  const [zenMode, setZenMode] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem("merchant.board.zenMode") === "1";
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        "merchant.board.headerHidden",
        headerHidden ? "1" : "0"
      );
    } catch {}
  }, [headerHidden]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        "merchant.board.zenMode",
        zenMode ? "1" : "0"
      );
    } catch {}
  }, [zenMode]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        "merchant.board.autoPrepareOnPaid",
        autoPrepareOnPaid ? "1" : "0"
      );
    } catch {}
  }, [autoPrepareOnPaid]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        "merchant.board.soundOn",
        soundOn ? "1" : "0"
      );
    } catch {}
  }, [soundOn]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem("merchant.board.volume", String(volume));
    } catch {}
  }, [volume]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        "merchant.board.notifOn",
        notifOn ? "1" : "0"
      );
    } catch {}
  }, [notifOn]);

  const ordersQ = useMerchantOrders(60);
  const rawOrders = ordersQ.data ?? [];
  const orders = React.useMemo(
    () => rawOrders.filter((o) => !isTerminal(o)),
    [rawOrders]
  );

  const prevIdsRef = React.useRef<Set<number>>(new Set());
  const prevPayRef = React.useRef<Map<number, string>>(new Map());

  const [newIds, setNewIds] = React.useState<Set<number>>(new Set());
  const [flashLane, setFlashLane] = React.useState<LaneKey | null>(null);

  React.useEffect(() => {
    const prevIds = prevIdsRef.current;
    const currentIds = new Set<number>(orders.map((o) => Number(o.id)));

    const created: number[] = [];
    for (const id of currentIds) {
      if (!prevIds.has(id)) created.push(id);
    }

    if (created.length) {
      setNewIds((s) => {
        const next = new Set(s);
        for (const id of created) next.add(id);
        return next;
      });

      setFlashLane("new");
      setTimeout(() => setFlashLane(null), 1200);

      if (notifOn) {
        requestNotifyPermission();
        notify("New order", `You have ${created.length} new order(s).`);
      }

      if (soundOn) playChime("new", volume);

      setTimeout(() => {
        setNewIds((s) => {
          const next = new Set(s);
          created.forEach((id) => next.delete(id));
          return next;
        });
      }, 7000);
    }

    const prevPay = prevPayRef.current;
    for (const o of orders) {
      const id = Number(o.id);
      const st = String(o.payment_status ?? "").toLowerCase();
      const prev = prevPay.get(id);
      if (prev && prev !== st && isPaid(o)) {
        if (soundOn) playChime("paid", volume);
        setToast({
          kind: "ok",
          text: `Payment confirmed for #${o.reference_no ?? o.id}`,
        });
      }
      prevPay.set(id, st);
    }

    prevIdsRef.current = currentIds;
  }, [orders, notifOn, soundOn, volume]);

  const acceptM = useMutation({
    mutationFn: async (order: MerchantOrderLite) => {
      return merchantAcceptOrder(token, Number(order.id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merchant-orders"] });
    },
  });

  const statusM = useMutation({
    mutationFn: async (p: {
      order: MerchantOrderLite;
      to: "accepted" | "preparing" | "ready";
    }) => {
      return merchantUpdateOrderStoreStatus(token, Number(p.order.id), p.to);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merchant-orders"] });
    },
  });

  const autoMoveInFlight = React.useRef<Set<number>>(new Set());
  React.useEffect(() => {
    if (!autoPrepareOnPaid) return;

    const eligible = orders.filter((o) => {
      const lane = laneForOrder(o);
      if (lane !== "accepted") return false;
      const gate = canMoveToPreparing(o);
      if (!gate.ok) return false;
      const id = Number(o.id);
      if (autoMoveInFlight.current.has(id)) return false;
      return true;
    });

    if (!eligible.length) return;

    (async () => {
      for (const o of eligible) {
        const id = Number(o.id);
        autoMoveInFlight.current.add(id);
        try {
          await merchantUpdateOrderStoreStatus(token, id, "preparing");
          setToast({
            kind: "ok",
            text: `Auto-moved to Preparing: #${o.reference_no ?? id}`,
          });
          if (soundOn) playChime("move", volume);
        } catch {
          setToast({
            kind: "warn",
            text: `Auto-move skipped for #${o.reference_no ?? id}`,
          });
        } finally {
          autoMoveInFlight.current.delete(id);
        }
      }
      qc.invalidateQueries({ queryKey: ["merchant-orders"] });
    })();
  }, [autoPrepareOnPaid, orders, token, qc, soundOn, volume]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't hijack typing
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        (t as any)?.isContentEditable
      )
        return;

      // H = toggle header, F = toggle fullscreen/zen, Esc = exit zen
      if (e.key.toLowerCase() === "h") setHeaderHidden((v) => !v);
      if (e.key.toLowerCase() === "f") setZenMode((v) => !v);
      if (e.key === "Escape") setZenMode(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const byLane = React.useMemo(() => {
    const m: Record<LaneKey, MerchantOrderLite[]> = {
      new: [],
      accepted: [],
      preparing: [],
      ready: [],
    };
    for (const o of orders) {
      m[laneForOrder(o)].push(o);
    }
    return m;
  }, [orders]);

  async function onDragEnd(e: DragEndEvent) {
    const orderId = parseOrderDragId(String(e.active?.id ?? ""));
    const toLane = parseLaneDropId(String(e.over?.id ?? ""));
    if (!orderId || !toLane) return;

    const order = orders.find((o) => Number(o.id) === orderId);
    if (!order) return;

    const fromLane = laneForOrder(order);
    if (fromLane === toLane) return;

    try {
      if (toLane === "accepted") {
        if (fromLane !== "new") return;
        await acceptM.mutateAsync(order);
        setToast({
          kind: "ok",
          text: `Accepted #${order.reference_no ?? order.id}`,
        });
        if (soundOn) playChime("move", volume);
        setFlashLane("accepted");
        setTimeout(() => setFlashLane(null), 800);
        return;
      }

      if (toLane === "preparing") {
        const gate = canMoveToPreparing(order);
        if (!gate.ok) {
          setToast({ kind: "warn", text: gate.reason ?? "Blocked" });
          return;
        }
        await statusM.mutateAsync({ order, to: "preparing" });
        setToast({
          kind: "ok",
          text: `Preparing #${order.reference_no ?? order.id}`,
        });
        if (soundOn) playChime("move", volume);
        setFlashLane("preparing");
        setTimeout(() => setFlashLane(null), 800);
        return;
      }

      if (toLane === "ready") {
        const gate = canMoveToReady(order);
        if (!gate.ok) {
          setToast({ kind: "warn", text: gate.reason ?? "Blocked" });
          return;
        }
        await statusM.mutateAsync({ order, to: "ready" });
        setToast({
          kind: "ok",
          text: `Ready #${order.reference_no ?? order.id}`,
        });
        if (soundOn) playChime("move", volume);
        setFlashLane("ready");
        setTimeout(() => setFlashLane(null), 800);
        return;
      }
    } catch (err: any) {
      setToast({ kind: "err", text: err?.message ?? "Action failed" });
    }
  }

  const kpi = kpiQ.data;
  const todaySold = Number(kpi?.today?.orders_sold ?? 0);
  const todayTxn = Number(kpi?.today?.transactions_count ?? 0);
  const todayNet = Number(kpi?.today?.net_sales_ex_platform_fee ?? 0);
  const allNet = Number(kpi?.all_time?.net_sales_ex_platform_fee ?? 0);

  function fmtPhp(n: number): string {
    const v = Number.isFinite(n) ? n : 0;
    return `₱${v.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return (
    <div
      className={cn(
        "h-[100dvh] min-h-screen overflow-hidden",
        zenMode ? "p-0" : "p-2 sm:p-3"
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-full max-w-[1600px] flex-col",
          zenMode ? "gap-2" : "gap-3"
        )}
      >
        {!zenMode && !headerHidden ? (
          <div className="shrink-0 max-h-[25dvh] overflow-y-auto rounded-2xl border border-border bg-card p-3 sm:p-4">
            {/* Keep header compact so lanes occupy most of the viewport */}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold">
                    Merchant Order Board
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Bell className="size-3" />
                    Live
                  </Badge>
                </div>
                {/* Intentionally minimal—keep the board tall for high order volume. */}
              </div>

              <div className="mt-2 w-full">
                <MerchantTabs />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden md:flex items-stretch gap-2">
                  <div className="rounded-2xl border border-border bg-card px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">
                      Today
                    </div>
                    <div className="mt-1 flex items-end gap-3">
                      <div>
                        <div className="text-xl font-semibold leading-none">
                          {todaySold}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Orders sold{todayTxn ? ` · ${todayTxn} txns` : ""}
                        </div>
                      </div>
                      <div className="min-w-[140px]">
                        <div className="text-[11px] text-muted-foreground">
                          Net sales (ex platform)
                        </div>
                        <div className="text-sm font-semibold">
                          {fmtPhp(todayNet)}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          All-time: {fmtPhp(allNet)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => nav("/merchant/upgrade")}
                  >
                    Upgrade
                  </Button>

                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => nav("/merchant/logout")}
                  >
                    Logout
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => ordersQ.refetch()}
                  disabled={ordersQ.isFetching}
                >
                  <RefreshCw
                    className={cn(
                      "mr-2 size-4",
                      ordersQ.isFetching && "animate-spin"
                    )}
                  />
                  Refresh
                </Button>

                <Toggle
                  label="Auto-move to Preparing when paid"
                  value={autoPrepareOnPaid}
                  onChange={setAutoPrepareOnPaid}
                  icon={<CheckCircle2 className="size-4" />}
                />

                <Toggle
                  label={soundOn ? "Sound on" : "Sound off"}
                  value={soundOn}
                  onChange={setSoundOn}
                  icon={
                    soundOn ? (
                      <Volume2 className="size-4" />
                    ) : (
                      <VolumeX className="size-4" />
                    )
                  }
                />

                <Toggle
                  label={headerHidden ? "Show header" : "Hide header"}
                  value={headerHidden}
                  onChange={(v) => setHeaderHidden(v)}
                  icon={<Separator className="size-4" />}
                />

                <Toggle
                  label={zenMode ? "Exit fullscreen" : "Fullscreen"}
                  value={zenMode}
                  onChange={(v) => {
                    setZenMode(v);
                    if (v) setHeaderHidden(true);
                    else setHeaderHidden(false);
                  }}
                  icon={<ShieldCheck className="size-4" />}
                />

                <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
                  <span className="text-xs text-muted-foreground">Vol</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-24"
                  />
                </div>

                <Toggle
                  label={notifOn ? "Desktop notif" : "No notif"}
                  value={notifOn}
                  onChange={(v) => {
                    setNotifOn(v);
                    if (v) requestNotifyPermission();
                  }}
                  icon={<Bell className="size-4" />}
                />
              </div>
            </div>

            {ordersQ.isError ? (
              <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                Failed to load orders. Check your API base URL and merchant
                role.
              </div>
            ) : null}
          </div>
        ) : null}
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            <div className="flex flex-1 min-h-0 gap-3 overflow-x-auto overflow-y-hidden pb-2 scrollbar">
              {LANES.map((lane) => {
                const laneOrders = byLane[lane.key];
                const dense = laneOrders.length > DENSE_LANE_THRESHOLD;

                return (
                  <Lane
                    key={lane.key}
                    lane={lane}
                    orders={laneOrders}
                    dense={dense}
                    highlight={flashLane === lane.key}
                  >
                    {laneOrders.length ? (
                      laneOrders.map((o) => (
                        <OrderCard
                          key={o.id}
                          order={o}
                          nowTick={nowTick}
                          isNew={newIds.has(Number(o.id))}
                          dense={dense}
                          onOpen={(ord) => setDetails(ord)}
                        />
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-card p-3 text-sm text-muted-foreground">
                        <div className="font-medium">Nothing here yet</div>
                        <div className="mt-1 text-xs">
                          Keep this tab open—new orders appear automatically.
                        </div>
                      </div>
                    )}
                  </Lane>
                );
              })}
            </div>
          </div>
        </DndContext>
      </div>

      {toast ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50">
          <Toast
            kind={toast.kind}
            text={toast.text}
            onClose={() => setToast(null)}
          />
        </div>
      ) : null}

      {details ? (
        <DetailsModal
          order={details}
          onClose={() => setDetails(null)}
          onToast={(t) => setToast(t)}
        />
      ) : null}
    </div>
  );
}
