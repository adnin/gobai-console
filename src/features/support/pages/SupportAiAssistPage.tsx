import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  supportAiAssist,
  type SupportAiAssistRequest,
  type SupportAiAssistResponse,
} from "@/features/support/api/supportApi";

type TicketPriority = "low" | "medium" | "high" | "urgent";

const DEFAULT_MESSAGE = "Where is my order? Driver has not arrived.";

function parseOptionalNumber(value: string) {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function buildPayload(input: {
  message: string;
  customerId: string;
  orderId: string;
  conversationId: string;
  channel: string;
  locale: string;
  createTicket: boolean;
  ticketSubject: string;
  ticketPriority: TicketPriority;
  ticketCategory: string;
  ticketTags: string;
  ticketReportedBy: string;
  ticketCustomerNote: string;
  temperature: string;
  maxTokens: string;
}): SupportAiAssistRequest {
  const payload: SupportAiAssistRequest = {
    message: input.message.trim(),
    create_ticket: input.createTicket,
  };

  const customerId = parseOptionalNumber(input.customerId);
  if (customerId != null) payload.customer_id = customerId;
  const orderId = parseOptionalNumber(input.orderId);
  if (orderId != null) payload.order_id = orderId;
  if (input.conversationId.trim()) payload.conversation_id = input.conversationId.trim();
  if (input.channel.trim()) payload.channel = input.channel.trim();
  if (input.locale.trim()) payload.locale = input.locale.trim();

  if (input.createTicket) {
    const tags = input.ticketTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const ticketMeta: Record<string, string> = {};
    if (input.ticketReportedBy.trim()) ticketMeta.reported_by = input.ticketReportedBy.trim();
    if (input.ticketCustomerNote.trim()) ticketMeta.customer_note = input.ticketCustomerNote.trim();

    const ticket: SupportAiAssistRequest["ticket"] = {
      subject: input.ticketSubject.trim() || undefined,
      priority: input.ticketPriority,
      category: input.ticketCategory.trim() || undefined,
      tags: tags.length ? tags : undefined,
      meta: Object.keys(ticketMeta).length ? ticketMeta : undefined,
    };

    payload.ticket = ticket;
  }

  const temperature = parseFloat(input.temperature);
  const maxTokens = parseOptionalNumber(input.maxTokens);
  if (!Number.isNaN(temperature) || maxTokens != null) {
    payload.ai = {
      temperature: Number.isNaN(temperature) ? undefined : temperature,
      max_output_tokens: maxTokens,
    };
  }

  return payload;
}

function ResponseBlock({ response }: { response?: SupportAiAssistResponse | null }) {
  if (!response) {
    return <div className="text-sm text-muted-foreground">No response yet.</div>;
  }

  const sources = response.kb_sources ?? [];
  const snapshot = response.order_snapshot ?? {};
  const ticket = response.ticket ?? {};
  const usage = response.ai_meta?.usage ?? {};

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Answer</div>
        <div className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-background/80 p-3">
          {response.answer ?? "No answer returned."}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={response.handoff_required ? "warning" : "secondary"}>
          {response.handoff_required ? "Handoff required" : "AI resolved"}
        </Badge>
        {response.rid ? <Badge variant="outline">RID {response.rid}</Badge> : null}
        {response.ai_meta?.model ? <Badge variant="outline">{response.ai_meta.model}</Badge> : null}
        {usage.input_tokens || usage.output_tokens ? (
          <Badge variant="outline">
            {usage.input_tokens ?? 0} in / {usage.output_tokens ?? 0} out
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order snapshot</div>
          <div className="mt-2 space-y-1">
            <div>
              <span className="text-xs text-muted-foreground">Status</span>
              <div className="font-medium">{snapshot.status ?? "n/a"}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">ETA</span>
              <div className="font-medium">
                {snapshot.eta_minutes ? `${snapshot.eta_minutes} min` : "n/a"}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Last update</span>
              <div className="font-medium">{snapshot.last_update_at ?? "n/a"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ticket</div>
          <div className="mt-2 space-y-1">
            <div>
              <span className="text-xs text-muted-foreground">ID</span>
              <div className="font-medium">{ticket.id ?? "n/a"}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Status</span>
              <div className="font-medium">{ticket.status ?? "n/a"}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Priority</span>
              <div className="font-medium">{ticket.priority ?? "n/a"}</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">KB sources</div>
        <div className="mt-2 space-y-2">
          {sources.length === 0 ? (
            <div className="text-sm text-muted-foreground">No KB sources returned.</div>
          ) : (
            sources.map((source) => (
              <div key={`${source.article_id}-${source.title}`} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{source.title ?? "Untitled article"}</div>
                  {source.score != null ? (
                    <Badge variant="outline">Score {source.score.toFixed(2)}</Badge>
                  ) : null}
                </div>
                {source.excerpt ? (
                  <div className="mt-2 text-xs text-muted-foreground">{source.excerpt}</div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function SupportAiAssistPage() {
  const { token } = useAuth();

  const [message, setMessage] = useState<string>(DEFAULT_MESSAGE);
  const [customerId, setCustomerId] = useState<string>("123");
  const [orderId, setOrderId] = useState<string>("456");
  const [conversationId, setConversationId] = useState<string>("cs_01HZX2QY1K3Z2M");
  const [channel, setChannel] = useState<string>("in_app");
  const [locale, setLocale] = useState<string>("en");
  const [createTicket, setCreateTicket] = useState<boolean>(true);
  const [ticketSubject, setTicketSubject] = useState<string>("Order not moving");
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>("high");
  const [ticketCategory, setTicketCategory] = useState<string>("delivery_delay");
  const [ticketTags, setTicketTags] = useState<string>("late, no_driver_arrival");
  const [ticketReportedBy, setTicketReportedBy] = useState<string>("customer");
  const [ticketCustomerNote, setTicketCustomerNote] = useState<string>("Driver is not moving on map");
  const [temperature, setTemperature] = useState<string>("0.2");
  const [maxTokens, setMaxTokens] = useState<string>("600");

  const payload = useMemo(
    () =>
      buildPayload({
        message,
        customerId,
        orderId,
        conversationId,
        channel,
        locale,
        createTicket,
        ticketSubject,
        ticketPriority,
        ticketCategory,
        ticketTags,
        ticketReportedBy,
        ticketCustomerNote,
        temperature,
        maxTokens,
      }),
    [
      message,
      customerId,
      orderId,
      conversationId,
      channel,
      locale,
      createTicket,
      ticketSubject,
      ticketPriority,
      ticketCategory,
      ticketTags,
      ticketReportedBy,
      ticketCustomerNote,
      temperature,
      maxTokens,
    ]
  );

  const m = useMutation({
    mutationFn: async () => supportAiAssist(String(token), payload),
  });

  const canSubmit = Boolean(token) && payload.message.length > 2;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Support AI Assist</div>
          <div className="text-sm text-muted-foreground">
            Generate a suggested response and optionally open a ticket.
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link to="/support">Back to Support</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assist request</CardTitle>
              <div className="text-sm text-muted-foreground">Fields map directly to the API payload.</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Message</div>
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Describe the customer issue..."
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Customer ID</div>
                  <Input value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder="123" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Order ID</div>
                  <Input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="456" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Conversation ID</div>
                  <Input
                    value={conversationId}
                    onChange={(event) => setConversationId(event.target.value)}
                    placeholder="cs_01..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Channel</div>
                  <Select value={channel} onChange={(event) => setChannel(event.target.value)}>
                    <option value="in_app">in_app</option>
                    <option value="email">email</option>
                    <option value="sms">sms</option>
                    <option value="whatsapp">whatsapp</option>
                  </Select>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Locale</div>
                  <Select value={locale} onChange={(event) => setLocale(event.target.value)}>
                    <option value="en">en</option>
                    <option value="id">id</option>
                    <option value="fil">fil</option>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="create-ticket"
                  type="checkbox"
                  className="h-4 w-4 accent-[color:var(--primary)]"
                  checked={createTicket}
                  onChange={(event) => setCreateTicket(event.target.checked)}
                />
                <label htmlFor="create-ticket" className="text-sm font-medium">
                  Create ticket
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => m.mutate()} disabled={!canSubmit || m.isPending}>
                  {m.isPending ? "Sending..." : "Run assist"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMessage(DEFAULT_MESSAGE);
                    setCustomerId("123");
                    setOrderId("456");
                    setConversationId("cs_01HZX2QY1K3Z2M");
                    setChannel("in_app");
                    setLocale("en");
                    setCreateTicket(true);
                    setTicketSubject("Order not moving");
                    setTicketPriority("high");
                    setTicketCategory("delivery_delay");
                    setTicketTags("late, no_driver_arrival");
                    setTicketReportedBy("customer");
                    setTicketCustomerNote("Driver is not moving on map");
                    setTemperature("0.2");
                    setMaxTokens("600");
                  }}
                >
                  Reset
                </Button>
                {m.isError ? (
                  <div className="text-sm text-destructive">
                    {(m.error as any)?.message ?? "Request failed"}
                  </div>
                ) : null}
                {m.isSuccess ? <div className="text-sm text-emerald-600">Response received.</div> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket options</CardTitle>
              <div className="text-sm text-muted-foreground">Only sent when ticket creation is enabled.</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Subject</div>
                  <Input
                    value={ticketSubject}
                    onChange={(event) => setTicketSubject(event.target.value)}
                    disabled={!createTicket}
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Priority</div>
                  <Select
                    value={ticketPriority}
                    onChange={(event) => setTicketPriority(event.target.value as TicketPriority)}
                    disabled={!createTicket}
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="urgent">urgent</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Category</div>
                  <Input
                    value={ticketCategory}
                    onChange={(event) => setTicketCategory(event.target.value)}
                    disabled={!createTicket}
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Tags (comma separated)</div>
                  <Input value={ticketTags} onChange={(event) => setTicketTags(event.target.value)} disabled={!createTicket} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Reported by</div>
                  <Input
                    value={ticketReportedBy}
                    onChange={(event) => setTicketReportedBy(event.target.value)}
                    disabled={!createTicket}
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Customer note</div>
                  <Input
                    value={ticketCustomerNote}
                    onChange={(event) => setTicketCustomerNote(event.target.value)}
                    disabled={!createTicket}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI settings</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Temperature</div>
                <Input value={temperature} onChange={(event) => setTemperature(event.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Max output tokens</div>
                <Input value={maxTokens} onChange={(event) => setMaxTokens(event.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request preview</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[260px] overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assist response</CardTitle>
              <div className="text-sm text-muted-foreground">Output from the AI assist endpoint.</div>
            </CardHeader>
            <CardContent>
              {m.isPending ? (
                <div className="text-sm text-muted-foreground">Waiting for response...</div>
              ) : (
                <ResponseBlock response={m.data} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Raw response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[360px] overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono">
                {m.data ? JSON.stringify(m.data, null, 2) : "No response yet."}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="my-6" />
    </div>
  );
}
