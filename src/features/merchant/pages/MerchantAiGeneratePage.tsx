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
import { merchantAiGenerate, type MerchantAiGenerateResponse } from "@/features/merchant/api/merchantAiApi";

const DEFAULT_PAYLOAD = `{
  "product_name": "Chicken Burger",
  "price": 99,
  "details": "Crispy, spicy option available",
  "promo": "Buy 1 Take 1 until Sunday"
}`;

function ResponseBlock({ response }: { response?: MerchantAiGenerateResponse | null }) {
  if (!response) return <div className="text-sm text-muted-foreground">No response yet.</div>;

  const result = response.result ?? {};
  const hashtags = Array.isArray((result as any).hashtags) ? (result as any).hashtags : [];

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2">
        {response.task ? <Badge variant="secondary">{response.task}</Badge> : null}
        {response.ai_meta?.model ? <Badge variant="outline">{response.ai_meta.model}</Badge> : null}
        {response.rid ? <Badge variant="outline">RID {response.rid}</Badge> : null}
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Headline</div>
        <div className="mt-2 text-base font-semibold">{(result as any).headline ?? "-"}</div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Body</div>
        <div className="mt-2 whitespace-pre-wrap">{(result as any).body ?? "-"}</div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hashtags</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {hashtags.length === 0 ? (
            <div className="text-muted-foreground">-</div>
          ) : (
            hashtags.map((tag: string) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disclaimer</div>
        <div className="mt-2">{(result as any).disclaimer ?? "-"}</div>
      </div>
    </div>
  );
}

export function MerchantAiGeneratePage() {
  const { token } = useAuth();

  const [task, setTask] = useState<string>("promo_description");
  const [storeId, setStoreId] = useState<string>("55");
  const [locale, setLocale] = useState<string>("en");
  const [tone, setTone] = useState<string>("friendly");
  const [maxChars, setMaxChars] = useState<string>("220");
  const [includeHashtags, setIncludeHashtags] = useState<boolean>(true);
  const [avoidList, setAvoidList] = useState<string>("misleading claims, medical claims");
  const [payloadJson, setPayloadJson] = useState<string>(DEFAULT_PAYLOAD);
  const [payloadError, setPayloadError] = useState<string>("");

  const requestPayload = useMemo(() => {
    return {
      task: task.trim(),
      store_id: Number(storeId) || undefined,
      locale: locale.trim() || undefined,
      tone: tone.trim() || undefined,
      constraints: {
        max_chars: Number(maxChars) || undefined,
        include_hashtags: includeHashtags,
        avoid: avoidList
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    };
  }, [task, storeId, locale, tone, maxChars, includeHashtags, avoidList]);

  const m = useMutation({
    mutationFn: async () => {
      let payloadObject: Record<string, any> = {};
      try {
        payloadObject = payloadJson.trim() ? JSON.parse(payloadJson) : {};
        setPayloadError("");
      } catch (err: any) {
        setPayloadError(err?.message ?? "Invalid JSON");
        throw err;
      }

      return merchantAiGenerate(String(token), {
        ...requestPayload,
        payload: payloadObject,
      });
    },
  });

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Merchant AI Assistant</div>
          <div className="text-sm text-muted-foreground">
            Generate promo copy, listings, or reply drafts.
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link to="/merchant">Back to Merchant</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generate content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Task</div>
                  <Input value={task} onChange={(event) => setTask(event.target.value)} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Store ID</div>
                  <Input value={storeId} onChange={(event) => setStoreId(event.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Locale</div>
                  <Select value={locale} onChange={(event) => setLocale(event.target.value)}>
                    <option value="en">en</option>
                    <option value="id">id</option>
                    <option value="fil">fil</option>
                  </Select>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Tone</div>
                  <Select value={tone} onChange={(event) => setTone(event.target.value)}>
                    <option value="friendly">friendly</option>
                    <option value="professional">professional</option>
                    <option value="concise">concise</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Max chars</div>
                  <Input value={maxChars} onChange={(event) => setMaxChars(event.target.value)} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Avoid (comma separated)</div>
                  <Input value={avoidList} onChange={(event) => setAvoidList(event.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="include-hashtags"
                  type="checkbox"
                  className="h-4 w-4 accent-[color:var(--primary)]"
                  checked={includeHashtags}
                  onChange={(event) => setIncludeHashtags(event.target.checked)}
                />
                <label htmlFor="include-hashtags" className="text-sm font-medium">
                  Include hashtags
                </label>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Payload (JSON)</div>
                <Textarea value={payloadJson} onChange={(event) => setPayloadJson(event.target.value)} />
                {payloadError ? <div className="mt-2 text-sm text-destructive">{payloadError}</div> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => m.mutate()} disabled={m.isPending || !task.trim()}>
                  {m.isPending ? "Generating..." : "Generate"}
                </Button>
                {m.isError ? (
                  <div className="text-sm text-destructive">{(m.error as any)?.message ?? "Failed"}</div>
                ) : null}
                {m.isSuccess ? <div className="text-sm text-emerald-600">Result ready.</div> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request preview</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[260px] overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono">
                {JSON.stringify(requestPayload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Response</CardTitle>
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
