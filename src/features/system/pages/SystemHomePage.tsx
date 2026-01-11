import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EndpointExample = {
  id: string;
  title?: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  summary?: string;
  request?: string;
  requestLabel?: string;
  response?: string;
  responseLabel?: string;
};

type Section = {
  id: string;
  title: string;
  description: string;
  endpoints: EndpointExample[];
};

const COMMON_HEADERS = `Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json`;

const supportAiRequest = `{
  "message": "Where is my order? Driver has not arrived.",
  "customer_id": 123,
  "order_id": 456,
  "conversation_id": "cs_01HZX2QY1K3Z2M",
  "channel": "in_app",
  "locale": "en",
  "create_ticket": true,
  "ticket": {
    "subject": "Order not moving",
    "priority": "high",
    "category": "delivery_delay",
    "tags": ["late", "no_driver_arrival"],
    "meta": {
      "reported_by": "customer",
      "customer_note": "Driver is not moving on map"
    }
  },
  "ai": {
    "temperature": 0.2,
    "max_output_tokens": 600
  }
}`;

const supportAiResponse = `{
  "answer": "Thanks for reporting this. I checked your order #456: it's currently in \\"Driver Assigned\\" status and the last update was 12 minutes ago. It looks like the driver hasn't started moving toward pickup yet.\\n\\nWhat I can do now:\\n1) I'll notify Support to contact the driver.\\n2) If the driver can't proceed, we can reassign.\\n\\nI've created a support ticket for faster handling. You'll get an update shortly.",
  "handoff_required": true,
  "kb_sources": [
    {
      "article_id": 18,
      "title": "Late Delivery: What happens next?",
      "score": 0.82,
      "excerpt": "If a driver is assigned but not moving for more than 10 minutes..."
    },
    {
      "article_id": 7,
      "title": "Reassignment policy",
      "score": 0.74,
      "excerpt": "Support may reassign a driver if..."
    }
  ],
  "order_snapshot": {
    "id": 456,
    "status": "driver_assigned",
    "service_type": "parcel",
    "merchant": {
      "id": 55,
      "name": "Mati Burger House"
    },
    "customer": {
      "id": 123,
      "name": "Jane D."
    },
    "driver": {
      "id": 88,
      "name": "Rider 88",
      "phone_masked": "+63****1234"
    },
    "timeline": [
      { "event": "created", "at": "2026-01-08T02:10:01Z" },
      { "event": "driver_assigned", "at": "2026-01-08T02:14:45Z" }
    ],
    "eta_minutes": 25,
    "last_update_at": "2026-01-08T02:14:45Z"
  },
  "ticket": {
    "id": 9012,
    "status": "open",
    "priority": "high",
    "subject": "Order not moving",
    "created_at": "2026-01-08T02:27:10Z"
  },
  "ai_meta": {
    "model": "gpt-4o-mini",
    "usage": {
      "input_tokens": 1450,
      "output_tokens": 220
    }
  },
  "rid": "a3b4b2f2-4f5c-4c52-9f01-1cce8a8c4c10"
}`;

const kbListResponse = `{
  "data": [
    {
      "id": 18,
      "title": "Late Delivery: What happens next?",
      "category": "delivery",
      "status": "published",
      "tags": ["late", "delay"],
      "updated_at": "2026-01-01T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 10, "total": 1 }
}`;

const kbDetailResponse = `{
  "id": 18,
  "title": "Late Delivery: What happens next?",
  "category": "delivery",
  "status": "published",
  "tags": ["late", "delay"],
  "visibility": "internal",
  "body_md": "## Late Delivery\\n\\nIf the driver is assigned but not moving...",
  "created_at": "2025-12-20T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}`;

const kbCreateRequest = `{
  "title": "Refund rules for cancelled orders",
  "category": "refunds",
  "status": "draft",
  "visibility": "internal",
  "tags": ["refund", "cancel"],
  "body_md": "## Refund rules\\n\\n- If cancelled before pickup: ...\\n- If cancelled after pickup: ...",
  "applies_to": ["transport", "parcel", "food"],
  "meta": { "source": "ops_policy_v2" }
}`;

const kbCreateResponse = `{
  "id": 22,
  "title": "Refund rules for cancelled orders",
  "status": "draft",
  "created_at": "2026-01-08T02:30:00Z",
  "updated_at": "2026-01-08T02:30:00Z"
}`;

const kbUpdateRequest = `{
  "status": "published",
  "body_md": "## Refund rules\\n\\nUpdated content...",
  "tags": ["refund", "cancel", "policy"]
}`;

const kbUpdateResponse = `{
  "id": 22,
  "status": "published",
  "updated_at": "2026-01-08T02:35:00Z"
}`;

const kbDeleteResponse = `{ "deleted": true }`;

const ticketListResponse = `{
  "data": [
    {
      "id": 9012,
      "order_id": 456,
      "customer_id": 123,
      "subject": "Order not moving",
      "status": "open",
      "priority": "high",
      "created_at": "2026-01-08T02:27:10Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 1 }
}`;

const ticketDetailResponse = `{
  "id": 9012,
  "order_id": 456,
  "customer_id": 123,
  "subject": "Order not moving",
  "status": "open",
  "priority": "high",
  "messages": [
    {
      "id": 1,
      "type": "customer",
      "message": "Driver has not arrived.",
      "created_at": "2026-01-08T02:26:30Z"
    },
    {
      "id": 2,
      "type": "support",
      "message": "We're checking with the driver now.",
      "created_at": "2026-01-08T02:28:10Z"
    }
  ],
  "created_at": "2026-01-08T02:27:10Z",
  "updated_at": "2026-01-08T02:28:10Z"
}`;

const ticketCreateRequest = `{
  "order_id": 456,
  "customer_id": 123,
  "subject": "Order not moving",
  "priority": "high",
  "channel": "in_app",
  "message": "Driver assigned but not moving for 10+ minutes.",
  "tags": ["late", "dispatch"],
  "meta": { "auto_created_by_ai": false }
}`;

const ticketCreateResponse = `{
  "id": 9013,
  "status": "open",
  "created_at": "2026-01-08T02:40:00Z"
}`;

const ticketMessageRequest = `{
  "message": "We called the driver. Reassigning now.",
  "internal_note": false,
  "attachments": [
    { "type": "image", "url": "https://..." }
  ]
}`;

const ticketMessageResponse = `{
  "message_id": 3,
  "ticket_id": 9013,
  "created_at": "2026-01-08T02:41:00Z"
}`;

const opsExplainResponse = `{
  "order_id": 456,
  "state_machine": {
    "current_state": "driver_assigned",
    "last_event": { "event": "driver_assigned", "at": "2026-01-08T02:14:45Z" },
    "expected_next_states": ["driver_arrived_pickup", "cancelled"],
    "allowed_transitions": [
      { "from": "driver_assigned", "to": "driver_arrived_pickup", "rule": "driver_location_near_pickup" },
      { "from": "driver_assigned", "to": "cancelled", "rule": "ops_or_customer_cancel_policy" }
    ],
    "blockers": [
      {
        "code": "driver_not_moving",
        "severity": "medium",
        "details": "No location update for 12 minutes"
      }
    ],
    "suggested_ops_actions": [
      { "action": "ping_driver", "reason": "Driver idle beyond threshold" },
      { "action": "reassign_driver", "reason": "No movement/location updates" }
    ]
  },
  "explanation": "Order 456 is stuck because it's in DRIVER_ASSIGNED and the driver hasn't progressed to ARRIVED_PICKUP. The last driver update was 12 minutes ago, so the system flags it as idle. Recommended: ping driver; if no response within SLA, reassign.",
  "suggested_next_actions": [
    {
      "action": "ping_driver",
      "payload": { "driver_id": 88, "order_id": 456 },
      "priority": "high"
    },
    {
      "action": "reassign_driver",
      "payload": { "order_id": 456, "reason": "idle_timeout" },
      "priority": "medium"
    }
  ],
  "ai_meta": {
    "model": "gpt-4o-mini",
    "usage": { "input_tokens": 1200, "output_tokens": 170 }
  },
  "rid": "0b2f8d52-3c33-4d0b-8e60-7f5d2f1b41aa"
}`;

const merchantAiRequest = `{
  "task": "promo_description",
  "store_id": 55,
  "locale": "en",
  "tone": "friendly",
  "constraints": {
    "max_chars": 220,
    "include_hashtags": true,
    "avoid": ["misleading claims", "medical claims"]
  },
  "payload": {
    "product_name": "Chicken Burger",
    "price": 99,
    "details": "Crispy, spicy option available",
    "promo": "Buy 1 Take 1 until Sunday"
  }
}`;

const merchantAiResponse = `{
  "task": "promo_description",
  "result": {
    "headline": "🍔 B1T1 Chicken Burger for ₱99 - this week only!",
    "body": "Crunchy, juicy, and ready to spice it up. Grab our Buy 1 Take 1 Chicken Burger until Sunday. Order now and enjoy fast delivery!",
    "hashtags": ["#GOBAI", "#MatiEats", "#BurgerTime"],
    "disclaimer": "Promo valid until Sunday. Limited stocks. Terms apply."
  },
  "ai_meta": {
    "model": "gpt-4o-mini",
    "usage": { "input_tokens": 700, "output_tokens": 140 }
  },
  "rid": "b2fd3d02-bd5b-4f02-8c7a-09b19b6c0c55"
}`;

const complianceCreateRequest = `{
  "type": "incident_report",
  "source_type": "driver_trust_events",
  "source_id": 999,
  "priority": "normal",
  "meta": {
    "requested_reason": "weekly audit",
    "requested_by_user_id": 1
  },
  "options": {
    "redact_pii": true,
    "include_timeline": true,
    "include_risk_flags": true
  }
}`;

const complianceCreateResponse = `{
  "summary_id": 3001,
  "status": "queued",
  "queued_at": "2026-01-08T03:00:00Z",
  "rid": "6e9a8b5b-8c2d-4c66-a1b2-5cb8d5a3a83a"
}`;

const complianceListResponse = `{
  "data": [
    {
      "id": 3001,
      "type": "incident_report",
      "source_type": "driver_trust_events",
      "source_id": 999,
      "status": "completed",
      "created_at": "2026-01-08T03:00:00Z",
      "completed_at": "2026-01-08T03:01:12Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 1 }
}`;

const complianceDetailResponse = `{
  "id": 3001,
  "type": "incident_report",
  "source_type": "driver_trust_events",
  "source_id": 999,
  "status": "completed",
  "summary": {
    "overview": "A customer reported aggressive language during delivery. The event was logged and escalated for review.",
    "timeline": [
      { "at": "2026-01-07T14:12:00Z", "event": "order_delivered" },
      { "at": "2026-01-07T14:20:00Z", "event": "customer_reported_incident" },
      { "at": "2026-01-08T03:00:00Z", "event": "summary_requested" }
    ],
    "risk_flags": ["harassment_language"],
    "recommended_actions": [
      "Contact customer for statement confirmation",
      "Request driver explanation within 24h",
      "Temporary warning flag on driver profile pending review"
    ],
    "pii_redacted": true
  },
  "ai_meta": {
    "model": "gpt-4o-mini",
    "usage": { "input_tokens": 1800, "output_tokens": 260 }
  },
  "created_at": "2026-01-08T03:00:00Z",
  "completed_at": "2026-01-08T03:01:12Z",
  "rid": "a9f15e0c-9c54-4b0f-a9aa-8f4fba6a6f0e"
}`;

const standardErrorResponse = `{
  "message": "This action is unauthorized.",
  "code": "FORBIDDEN",
  "details": null,
  "rid": "60d3658f-7e2c-4353-85b2-39a92ede3981"
}`;

const sections: Section[] = [
  {
    id: "support-ai",
    title: "Support Agent AI",
    description: "Answer customer questions with optional ticket creation and AI metadata.",
    endpoints: [
      {
        id: "support-ai-assist",
        title: "Assist + optional ticket",
        method: "POST",
        path: "/api/v1/support/ai/assist",
        request: supportAiRequest,
        response: supportAiResponse,
      },
    ],
  },
  {
    id: "support-kb",
    title: "Support KB CRUD",
    description: "Knowledge base authoring and publishing endpoints.",
    endpoints: [
      {
        id: "kb-list",
        title: "List articles",
        method: "GET",
        path: "/api/v1/support/kb/articles?status=published&q=late&page=1&per_page=10",
        request: "?status=published&q=late&page=1&per_page=10",
        requestLabel: "Query",
        response: kbListResponse,
      },
      {
        id: "kb-detail",
        title: "Get article",
        method: "GET",
        path: "/api/v1/support/kb/articles/18",
        response: kbDetailResponse,
      },
      {
        id: "kb-create",
        title: "Create article",
        method: "POST",
        path: "/api/v1/support/kb/articles",
        request: kbCreateRequest,
        response: kbCreateResponse,
      },
      {
        id: "kb-update",
        title: "Update article",
        method: "PUT",
        path: "/api/v1/support/kb/articles/22",
        request: kbUpdateRequest,
        response: kbUpdateResponse,
      },
      {
        id: "kb-delete",
        title: "Delete article",
        method: "DELETE",
        path: "/api/v1/support/kb/articles/22",
        response: kbDeleteResponse,
      },
    ],
  },
  {
    id: "support-tickets",
    title: "Support Tickets",
    description: "Ticket listing, creation, and message updates.",
    endpoints: [
      {
        id: "ticket-list",
        title: "List tickets",
        method: "GET",
        path: "/api/v1/support/tickets?status=open&order_id=456&page=1&per_page=20",
        request: "?status=open&order_id=456&page=1&per_page=20",
        requestLabel: "Query",
        response: ticketListResponse,
      },
      {
        id: "ticket-detail",
        title: "Get ticket",
        method: "GET",
        path: "/api/v1/support/tickets/9012",
        response: ticketDetailResponse,
      },
      {
        id: "ticket-create",
        title: "Create ticket",
        method: "POST",
        path: "/api/v1/support/tickets",
        request: ticketCreateRequest,
        response: ticketCreateResponse,
      },
      {
        id: "ticket-message",
        title: "Add message",
        method: "POST",
        path: "/api/v1/support/tickets/9013/messages",
        request: ticketMessageRequest,
        response: ticketMessageResponse,
      },
    ],
  },
  {
    id: "ops-stuck",
    title: "Ops: Why is this order stuck?",
    description: "Explain blockers and suggest ops actions for delayed orders.",
    endpoints: [
      {
        id: "ops-explain",
        method: "GET",
        path: "/api/v1/ops/orders/456/ai/explain-stuck?include_ai=1",
        request: "?include_ai=1",
        requestLabel: "Query",
        response: opsExplainResponse,
      },
    ],
  },
  {
    id: "merchant-ai",
    title: "Merchant Assistant",
    description: "Generate copy variants for merchant listings and promos.",
    endpoints: [
      {
        id: "merchant-ai-generate",
        method: "POST",
        path: "/api/v1/merchant/ai/generate",
        request: merchantAiRequest,
        response: merchantAiResponse,
      },
    ],
  },
  {
    id: "compliance",
    title: "Compliance Summaries (Async)",
    description: "Queue and retrieve compliance summaries with PII redaction.",
    endpoints: [
      {
        id: "compliance-create",
        title: "Queue summary",
        method: "POST",
        path: "/api/v1/system/compliance/summaries",
        request: complianceCreateRequest,
        response: complianceCreateResponse,
        responseLabel: "Response (queued)",
      },
      {
        id: "compliance-list",
        title: "List summaries",
        method: "GET",
        path: "/api/v1/system/compliance/summaries?status=completed&page=1&per_page=20",
        request: "?status=completed&page=1&per_page=20",
        requestLabel: "Query",
        response: complianceListResponse,
      },
      {
        id: "compliance-detail",
        title: "Get summary",
        method: "GET",
        path: "/api/v1/system/compliance/summaries/3001",
        response: complianceDetailResponse,
        responseLabel: "Response (completed)",
      },
    ],
  },
];

const methodVariant = {
  GET: "secondary",
  POST: "default",
  PUT: "warning",
  DELETE: "danger",
} as const;

const navItems = [
  { id: "common-headers", label: "Common headers" },
  { id: "support-ai", label: "Support Agent AI" },
  { id: "support-kb", label: "Support KB CRUD" },
  { id: "support-tickets", label: "Support Tickets" },
  { id: "ops-stuck", label: "Ops order stuck" },
  { id: "merchant-ai", label: "Merchant assistant" },
  { id: "compliance", label: "Compliance summaries" },
  { id: "standard-errors", label: "Standard errors" },
];

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <pre className="max-h-[360px] overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed font-mono">
        {code}
      </pre>
    </div>
  );
}

function EndpointBlock({ endpoint }: { endpoint: EndpointExample }) {
  const gridCols = endpoint.request && endpoint.response ? "lg:grid-cols-2" : "lg:grid-cols-1";
  const requestLabel = endpoint.requestLabel ?? "Request";
  const responseLabel = endpoint.responseLabel ?? "Response";

  return (
    <div className="rounded-lg border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={methodVariant[endpoint.method]}>{endpoint.method}</Badge>
          <div className="text-sm font-semibold">{endpoint.path}</div>
        </div>
      </div>
      {endpoint.title ? <div className="mt-2 text-sm font-medium">{endpoint.title}</div> : null}
      {endpoint.summary ? <div className="mt-1 text-sm text-muted-foreground">{endpoint.summary}</div> : null}
      <div className={`mt-4 grid grid-cols-1 gap-4 ${gridCols}`}>
        {endpoint.request ? <CodeBlock label={requestLabel} code={endpoint.request} /> : null}
        {endpoint.response ? <CodeBlock label={responseLabel} code={endpoint.response} /> : null}
      </div>
    </div>
  );
}

export function SystemHomePage() {
  const endpointCount = sections.reduce((sum, section) => sum + section.endpoints.length, 0);

  return (
    <div className="min-h-full bg-background">
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Enterprise AI Operations</div>
              <div className="text-sm text-muted-foreground">
                Contract reference for support, ops, merchant, and compliance automation.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">v1</Badge>
              <Badge variant="outline">Internal</Badge>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Roles covered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">support</Badge>
                  <Badge variant="secondary">ops</Badge>
                  <Badge variant="secondary">merchant</Badge>
                  <Badge variant="secondary">system</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{endpointCount}</div>
                <div className="text-xs text-muted-foreground">Includes async summaries + KB CRUD</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">Bearer token</div>
                <div className="text-xs text-muted-foreground">JSON over HTTPS, versioned /api/v1</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {navItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  >
                    {item.label}
                  </a>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card id="common-headers">
              <CardHeader>
                <CardTitle>Common headers</CardTitle>
                <div className="text-sm text-muted-foreground">Send with every request.</div>
              </CardHeader>
              <CardContent>
                <CodeBlock label="Headers" code={COMMON_HEADERS} />
              </CardContent>
            </Card>

            {sections.map((section) => (
              <Card key={section.id} id={section.id}>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                  <div className="text-sm text-muted-foreground">{section.description}</div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.endpoints.map((endpoint) => (
                    <EndpointBlock key={endpoint.id} endpoint={endpoint} />
                  ))}
                </CardContent>
              </Card>
            ))}

            <Card id="standard-errors">
              <CardHeader>
                <CardTitle>Standard error response</CardTitle>
                <div className="text-sm text-muted-foreground">Used across all endpoints.</div>
              </CardHeader>
              <CardContent>
                <CodeBlock label="Response" code={standardErrorResponse} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
