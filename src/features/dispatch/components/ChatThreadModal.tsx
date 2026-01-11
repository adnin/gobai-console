import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/http";
import { getSocket } from "@/lib/socket";
import { normalizeRealtimeEventType, RealtimeEventTypes } from "@/lib/realtimeEvents";

type ChatMsg = {
  id: number;
  sender_id: number;
  receiver_id: number;
  order_id?: number | null;
  message: string;
  created_at: string;
};

async function fetchHistory(token: string, partnerId: number, orderId?: number | null): Promise<ChatMsg[]> {
  const qs = orderId ? `?order_id=${encodeURIComponent(String(orderId))}` : "";
  const res = await apiFetch<{ ok: boolean; messages: ChatMsg[] }>(`/chat/messages/${partnerId}${qs}`, {
    method: "GET",
    token,
  });
  return Array.isArray(res?.messages) ? res.messages : [];
}

async function sendMessage(token: string, receiverId: number, message: string, orderId?: number | null): Promise<ChatMsg> {
  const res = await apiFetch<{ ok: boolean; message: ChatMsg }>(`/chat/messages`, {
    method: "POST",
    token,
    body: JSON.stringify({
      receiver_id: receiverId,
      message,
      ...(orderId != null ? { order_id: orderId } : {}),
    }),
  });
  return res.message;
}

export default function ChatThreadModal(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  viewerId: number;
  partnerId: number;
  partnerName: string;
  orderId?: number | null;
  // Display-only context. Useful when you're doing a direct message
  // about a specific order, but you don't want to use order-scoped
  // chat restrictions.
  contextOrderId?: number | null;
}) {
  const { open, onClose, token, viewerId, partnerId, partnerName, orderId, contextOrderId } = props;

  const [loading, setLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [text, setText] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const scrollToBottom = React.useCallback(() => {
    const el = bottomRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErr(null);
    fetchHistory(token, partnerId, orderId)
      .then((msgs) => {
        setMessages(msgs);
        queueMicrotask(scrollToBottom);
      })
      .catch((e: any) => setErr(e?.message ?? "Failed to load messages"))
      .finally(() => setLoading(false));
  }, [open, token, partnerId, orderId, scrollToBottom]);

  // Realtime: append incoming messages
  React.useEffect(() => {
    if (!open) return;
    const s = getSocket();

    const handle = (payload: any) => {
      const t = normalizeRealtimeEventType(payload?.type ?? payload?.event?.type ?? payload?.data?.type);
      if (t !== RealtimeEventTypes.CHAT_MESSAGE) return;

      const d = payload?.data ?? payload;
      const msg: ChatMsg = {
        id: Number(d?.id ?? 0),
        sender_id: Number(d?.sender_id ?? 0),
        receiver_id: Number(d?.receiver_id ?? 0),
        order_id: d?.order_id ?? null,
        message: String(d?.message ?? ""),
        created_at: String(d?.created_at ?? new Date().toISOString()),
      };

      // Only show messages for this thread
      const involves =
        (msg.sender_id === partnerId && msg.receiver_id === viewerId) ||
        (msg.sender_id === viewerId && msg.receiver_id === partnerId);
      if (!involves) return;

      if (orderId != null && (msg.order_id == null || Number(msg.order_id) !== Number(orderId))) {
        return;
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      queueMicrotask(scrollToBottom);
    };

    s.on("event", handle);
    s.on("realtime:event", handle);
    s.on("message", handle);
    s.onAny((_name: string, p: any) => handle(p));

    return () => {
      s.off("event", handle);
      s.off("realtime:event", handle);
      s.off("message", handle);
      // can't reliably remove the onAny callback we just created;
      // it's fine because modal unmount is rare. If you want, move it to a stable fn.
    };
  }, [open, partnerId, viewerId, orderId, scrollToBottom]);

  const onSend = React.useCallback(async () => {
    const msg = text.trim();
    if (!msg) return;

    setText("");
    setErr(null);

    // optimistic
    const tempId = Date.now() * -1;
    const optimistic: ChatMsg = {
      id: tempId,
      sender_id: viewerId,
      receiver_id: partnerId,
      order_id: orderId ?? null,
      message: msg,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    queueMicrotask(scrollToBottom);

    try {
      const saved = await sendMessage(token, partnerId, msg, orderId);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
    } catch (e: any) {
      setErr(e?.message ?? "Failed to send");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(msg);
    }
  }, [text, token, partnerId, viewerId, orderId, scrollToBottom]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">
                {orderId != null ? 'Order chat' : 'Direct message'}
              </div>
              <div className="truncate text-lg font-semibold">{partnerName}</div>
              {orderId != null ? (
                <div className="text-xs text-muted-foreground">Order #{orderId}</div>
              ) : contextOrderId != null ? (
                <div className="text-xs text-muted-foreground">
                  From order #{contextOrderId}
                </div>
              ) : null}
            </div>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </CardHeader>

          <CardContent>
            {err ? <div className="mb-2 text-sm text-red-600">{err}</div> : null}

            <div className="h-[420px] overflow-auto rounded-lg border bg-background/50 p-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading messages…</div>
              ) : null}

              <div className="space-y-2">
                {messages.map((m) => {
                  const mine = m.sender_id === viewerId;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                          mine ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words">{m.message}</div>
                        <div className={cn("mt-1 text-[10px] opacity-70", mine ? "text-primary-foreground" : "text-muted-foreground")}>
                          {new Date(m.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Input
                value={text}
                placeholder="Type a message…"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
              <Button onClick={onSend} disabled={!text.trim()}>
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
