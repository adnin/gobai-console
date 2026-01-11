import * as React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { setGlobalApiErrorHandler } from "@/lib/http";
import { formatToastError } from "@/lib/apiError";

type ToastKind = "ok" | "warn" | "err";

type ToastItem = {
  id: string;
  kind: ToastKind;
  text: string;
  createdAt: number;
};

type ToastApi = {
  show: (kind: ToastKind, text: string, opts?: { ttlMs?: number }) => void;
  ok: (text: string, opts?: { ttlMs?: number }) => void;
  warn: (text: string, opts?: { ttlMs?: number }) => void;
  err: (text: string, opts?: { ttlMs?: number }) => void;
  apiErr: (err: any, fallback?: string) => void;
};

const ToastCtx = React.createContext<ToastApi | null>(null);

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const icon =
    item.kind === "ok" ? (
      <CheckCircle2 className="size-4" />
    ) : item.kind === "warn" ? (
      <AlertTriangle className="size-4" />
    ) : (
      <AlertTriangle className="size-4" />
    );

  const sub = item.kind === "err" ? "Action failed" : item.kind === "warn" ? "Please review" : "Done";

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-[360px] max-w-[92vw] items-start gap-2 rounded-xl border p-3 shadow-lg",
        item.kind === "ok"
          ? "border-[color:var(--success)]/30 bg-[color:var(--success)]/10"
          : item.kind === "warn"
          ? "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10"
          : "border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10"
      )}
      role="status"
    >
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="whitespace-pre-wrap text-sm font-medium leading-tight">{item.text}</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </div>
      <button
        type="button"
        className="-mr-1 -mt-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={onClose}
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = React.useCallback(
    (kind: ToastKind, text: string, opts?: { ttlMs?: number }) => {
      const id = uid();
      const ttlMs = opts?.ttlMs ?? 6_000;
      setItems((prev) => [{ id, kind, text, createdAt: Date.now() }, ...prev].slice(0, 3));
      window.setTimeout(() => remove(id), ttlMs);
    },
    [remove]
  );

  const api: ToastApi = React.useMemo(
    () => ({
      show,
      ok: (t, o) => show("ok", t, o),
      warn: (t, o) => show("warn", t, o),
      err: (t, o) => show("err", t, o),
      apiErr: (e, fallback) => show("err", formatToastError(e, fallback), { ttlMs: 8_000 }),
    }),
    [show]
  );

  // Wire global API errors -> toast
  React.useEffect(() => {
    setGlobalApiErrorHandler((err) => {
      // Avoid spamming: only show for non-401 by default
      if (err.status === 401) return;
      api.apiErr(err);
    });
    return () => setGlobalApiErrorHandler(null);
  }, [api]);

  return (
    <ToastCtx.Provider value={api}>
      {children}

      {/* Viewport */}
      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex flex-col gap-2">
        {items.map((it) => (
          <ToastCard key={it.id} item={it} onClose={() => remove(it.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
