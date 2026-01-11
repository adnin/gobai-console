import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  supportAddTicketMessage,
  supportCreateTicket,
  supportGetTicket,
  supportListTickets,
  type SupportTicketRow,
} from "@/features/support/api/supportApi";

function parseList(value: string): string[] | undefined {
  const list = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length ? list : undefined;
}

function fmt(ts?: string) {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function SupportTicketsPage() {
  const { token } = useAuth();

  const [status, setStatus] = useState<string>("open");
  const [orderId, setOrderId] = useState<string>("456");
  const [perPage, setPerPage] = useState<string>("20");

  const listParams = useMemo(
    () => ({
      status: status || undefined,
      order_id: Number(orderId) || undefined,
      page: 1,
      per_page: Number(perPage) || 20,
    }),
    [status, orderId, perPage]
  );

  const listQ = useQuery({
    queryKey: ["support", "tickets", listParams],
    queryFn: async () => supportListTickets(String(token), listParams),
    enabled: !!token,
  });

  const rows = listQ.data?.data ?? [];

  const [detailIdInput, setDetailIdInput] = useState<string>("9012");
  const detailId = Number(detailIdInput);
  const hasDetailId = Number.isFinite(detailId) && detailId > 0;

  const detailQ = useQuery({
    queryKey: ["support", "tickets", "detail", detailId],
    queryFn: async () => supportGetTicket(String(token), detailId),
    enabled: !!token && hasDetailId,
  });

  const [createOrderId, setCreateOrderId] = useState<string>("456");
  const [createCustomerId, setCreateCustomerId] = useState<string>("123");
  const [createSubject, setCreateSubject] = useState<string>("Order not moving");
  const [createPriority, setCreatePriority] = useState<string>("high");
  const [createChannel, setCreateChannel] = useState<string>("in_app");
  const [createMessage, setCreateMessage] = useState<string>(
    "Driver assigned but not moving for 10+ minutes."
  );
  const [createTags, setCreateTags] = useState<string>("late, dispatch");
  const [createAutoFlag, setCreateAutoFlag] = useState<boolean>(false);

  const createM = useMutation({
    mutationFn: async () =>
      supportCreateTicket(String(token), {
        order_id: Number(createOrderId) || undefined,
        customer_id: Number(createCustomerId) || undefined,
        subject: createSubject.trim(),
        priority: createPriority.trim() || undefined,
        channel: createChannel.trim() || undefined,
        message: createMessage.trim() || undefined,
        tags: parseList(createTags),
        meta: { auto_created_by_ai: createAutoFlag },
      }),
  });

  const [messageTicketId, setMessageTicketId] = useState<string>("9013");
  const [messageBody, setMessageBody] = useState<string>("We called the driver. Reassigning now.");
  const [internalNote, setInternalNote] = useState<boolean>(false);
  const [attachmentType, setAttachmentType] = useState<string>("image");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("https://");
  const messageTicketIdValue = Number(messageTicketId);
  const canSendMessage =
    Number.isFinite(messageTicketIdValue) && messageTicketIdValue > 0 && messageBody.trim().length > 0;

  const messageM = useMutation({
    mutationFn: async () => {
      if (!Number.isFinite(messageTicketIdValue) || messageTicketIdValue <= 0) {
        throw new Error("Valid ticket ID required");
      }
      if (!messageBody.trim()) {
        throw new Error("Message is required");
      }
      return supportAddTicketMessage(String(token), messageTicketIdValue, {
        message: messageBody.trim(),
        internal_note: internalNote,
        attachments:
          attachmentUrl.trim() && attachmentUrl.trim() !== "https://"
            ? [{ type: attachmentType.trim() || "image", url: attachmentUrl.trim() }]
            : undefined,
      });
    },
  });

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Support Tickets</div>
          <div className="text-sm text-muted-foreground">Track customer conversations and resolutions.</div>
        </div>
        <Button asChild variant="secondary">
          <Link to="/support">Back to Support</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Status</div>
                  <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="">All</option>
                    <option value="open">open</option>
                    <option value="pending">pending</option>
                    <option value="closed">closed</option>
                  </Select>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Order ID</div>
                  <Input value={orderId} onChange={(event) => setOrderId(event.target.value)} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Per page</div>
                  <Input value={perPage} onChange={(event) => setPerPage(event.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={() => listQ.refetch()} disabled={listQ.isFetching}>
                    {listQ.isFetching ? "Loading..." : "Search"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStatus("");
                      setOrderId("");
                      setPerPage("20");
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              {listQ.isError ? (
                <div className="text-sm text-destructive">{(listQ.error as any)?.message ?? "Failed"}</div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Results</CardTitle>
              <div className="text-sm text-muted-foreground">{listQ.isLoading ? "Loading..." : `${rows.length} rows`}</div>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2">Order</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Priority</th>
                      <th className="px-3 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row: SupportTicketRow) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-t border-border hover:bg-muted/20"
                        onClick={() => setDetailIdInput(String(row.id))}
                      >
                        <td className="px-3 py-2 font-medium">#{row.id}</td>
                        <td className="px-3 py-2">{row.subject ?? "-"}</td>
                        <td className="px-3 py-2">{row.order_id ?? "-"}</td>
                        <td className="px-3 py-2">{row.status ?? "-"}</td>
                        <td className="px-3 py-2">{row.priority ?? "-"}</td>
                        <td className="px-3 py-2">{fmt(row.created_at)}</td>
                      </tr>
                    ))}
                    {!listQ.isLoading && rows.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                          No tickets found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket detail</CardTitle>
              <div className="text-sm text-muted-foreground">Load a ticket by ID.</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1">
                  <div className="mb-1 text-xs text-muted-foreground">Ticket ID</div>
                  <Input value={detailIdInput} onChange={(event) => setDetailIdInput(event.target.value)} />
                </div>
                <Button onClick={() => detailQ.refetch()} disabled={!hasDetailId || detailQ.isFetching}>
                  {detailQ.isFetching ? "Loading..." : "Load"}
                </Button>
              </div>

              {detailQ.isError ? (
                <div className="text-sm text-destructive">{(detailQ.error as any)?.message ?? "Failed"}</div>
              ) : null}

              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                {detailQ.data ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold">{detailQ.data.subject ?? "-"}</div>
                      {detailQ.data.status ? <Badge variant="secondary">{detailQ.data.status}</Badge> : null}
                      {detailQ.data.priority ? <Badge variant="outline">{detailQ.data.priority}</Badge> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {fmt(detailQ.data.created_at)} · Updated {fmt(detailQ.data.updated_at)}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      {(detailQ.data.messages ?? []).map((msg) => (
                        <div key={`${msg.id}-${msg.created_at}`} className="rounded-lg border border-border bg-background/80 p-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{msg.type ?? "message"}</span>
                            <span>{fmt(msg.created_at)}</span>
                          </div>
                          <div className="mt-2 whitespace-pre-wrap">{msg.message ?? "-"}</div>
                        </div>
                      ))}
                      {(detailQ.data.messages ?? []).length === 0 ? (
                        <div className="text-muted-foreground">No messages yet.</div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">No ticket loaded.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Order ID</div>
                  <Input value={createOrderId} onChange={(event) => setCreateOrderId(event.target.value)} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Customer ID</div>
                  <Input value={createCustomerId} onChange={(event) => setCreateCustomerId(event.target.value)} />
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Subject</div>
                <Input value={createSubject} onChange={(event) => setCreateSubject(event.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Priority</div>
                  <Select value={createPriority} onChange={(event) => setCreatePriority(event.target.value)}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="urgent">urgent</option>
                  </Select>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Channel</div>
                  <Select value={createChannel} onChange={(event) => setCreateChannel(event.target.value)}>
                    <option value="in_app">in_app</option>
                    <option value="email">email</option>
                    <option value="sms">sms</option>
                  </Select>
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Message</div>
                <Textarea value={createMessage} onChange={(event) => setCreateMessage(event.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Tags</div>
                <Input value={createTags} onChange={(event) => setCreateTags(event.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="auto-created"
                  type="checkbox"
                  className="h-4 w-4 accent-[color:var(--primary)]"
                  checked={createAutoFlag}
                  onChange={(event) => setCreateAutoFlag(event.target.checked)}
                />
                <label htmlFor="auto-created" className="text-sm font-medium">
                  Auto created by AI
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => createM.mutate()} disabled={createM.isPending || !createSubject.trim()}>
                  {createM.isPending ? "Creating..." : "Create ticket"}
                </Button>
                {createM.isError ? (
                  <div className="text-sm text-destructive">{(createM.error as any)?.message ?? "Failed"}</div>
                ) : null}
                {createM.isSuccess ? (
                  <div className="text-sm text-emerald-600">Created ticket #{createM.data?.id ?? "-"}</div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Ticket ID</div>
                <Input value={messageTicketId} onChange={(event) => setMessageTicketId(event.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Message</div>
                <Textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Attachment type</div>
                  <Input value={attachmentType} onChange={(event) => setAttachmentType(event.target.value)} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Attachment URL</div>
                  <Input value={attachmentUrl} onChange={(event) => setAttachmentUrl(event.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="internal-note"
                  type="checkbox"
                  className="h-4 w-4 accent-[color:var(--primary)]"
                  checked={internalNote}
                  onChange={(event) => setInternalNote(event.target.checked)}
                />
                <label htmlFor="internal-note" className="text-sm font-medium">
                  Internal note
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => messageM.mutate()} disabled={messageM.isPending || !canSendMessage}>
                  {messageM.isPending ? "Sending..." : "Send message"}
                </Button>
                {messageM.isError ? (
                  <div className="text-sm text-destructive">{(messageM.error as any)?.message ?? "Failed"}</div>
                ) : null}
                {messageM.isSuccess ? (
                  <div className="text-sm text-emerald-600">Message sent.</div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
