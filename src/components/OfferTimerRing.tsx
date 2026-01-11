import * as React from "react";
import { cn } from "@/lib/utils";
import { msRemaining, offerTtlSeconds } from "@/features/dispatch/offer/offerTime";

export function OfferTimerRing(props: {
  expiresAt?: string | null;
  state: "pending" | "accepted" | "expired" | "rejected";
  size?: number;
  title?: string;
}) {
  const size = props.size ?? 18;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (props.state !== "pending") return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [props.state]);

  const totalMs = offerTtlSeconds() * 1000;
  const remaining = props.state === "pending" ? msRemaining(props.expiresAt ?? null) : 0;
  const pct = props.state === "pending" ? Math.max(0, Math.min(1, remaining / totalMs)) : 0;

  const dash = c * pct;

  const color =
    props.state === "pending"
      ? "text-yellow-500"
      : props.state === "accepted"
      ? "text-emerald-500"
      : "text-red-500";

  const label =
    props.state === "pending"
      ? `Offer pending (${Math.ceil(remaining / 1000)}s)`
      : props.state === "accepted"
      ? "Accepted"
      : props.state === "expired"
      ? "Timed out"
      : "Rejected";

  return (
    <span className="inline-flex items-center gap-2" title={props.title ?? label}>
      <svg width={size} height={size} className={cn("shrink-0", color)} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeOpacity="0.2" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="text-xs text-muted-foreground">{props.state === "pending" ? `${Math.ceil(remaining/1000)}s` : label}</span>
    </span>
  );
}
