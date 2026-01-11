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
  supportCreateKbArticle,
  supportDeleteKbArticle,
  supportGetKbArticle,
  supportListKbArticles,
  supportUpdateKbArticle,
  type SupportKbArticleRow,
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

export function SupportKbPage() {
  const { token } = useAuth();

  const [status, setStatus] = useState<string>("published");
  const [query, setQuery] = useState<string>("late");
  const [perPage, setPerPage] = useState<string>("10");

  const listParams = useMemo(
    () => ({
      status: status || undefined,
      q: query || undefined,
      page: 1,
      per_page: Number(perPage) || 10,
    }),
    [status, query, perPage]
  );

  const listQ = useQuery({
    queryKey: ["support", "kb", listParams],
    queryFn: async () => supportListKbArticles(String(token), listParams),
    enabled: !!token,
  });

  const rows = listQ.data?.data ?? [];

  const [detailIdInput, setDetailIdInput] = useState<string>("");
  const detailId = Number(detailIdInput);
  const hasDetailId = Number.isFinite(detailId) && detailId > 0;

  const detailQ = useQuery({
    queryKey: ["support", "kb", "detail", detailId],
    queryFn: async () => supportGetKbArticle(String(token), detailId),
    enabled: !!token && hasDetailId,
  });

  const [createTitle, setCreateTitle] = useState<string>("Refund rules for cancelled orders");
  const [createCategory, setCreateCategory] = useState<string>("refunds");
  const [createStatus, setCreateStatus] = useState<string>("draft");
  const [createVisibility, setCreateVisibility] = useState<string>("internal");
  const [createTags, setCreateTags] = useState<string>("refund, cancel");
  const [createBody, setCreateBody] = useState<string>(
    "## Refund rules\n\n- If cancelled before pickup: ...\n- If cancelled after pickup: ..."
  );
  const [createAppliesTo, setCreateAppliesTo] = useState<string>("transport, parcel, food");
  const [createMetaSource, setCreateMetaSource] = useState<string>("ops_policy_v2");

  const createM = useMutation({
    mutationFn: async () =>
      supportCreateKbArticle(String(token), {
        title: createTitle.trim(),
        category: createCategory.trim() || undefined,
        status: createStatus.trim() || undefined,
        visibility: createVisibility.trim() || undefined,
        tags: parseList(createTags),
        body_md: createBody.trim() || undefined,
        applies_to: parseList(createAppliesTo),
        meta: createMetaSource.trim() ? { source: createMetaSource.trim() } : undefined,
      }),
  });

  const [updateId, setUpdateId] = useState<string>("");
  const [updateStatus, setUpdateStatus] = useState<string>("published");
  const [updateTags, setUpdateTags] = useState<string>("refund, cancel, policy");
  const [updateBody, setUpdateBody] = useState<string>("## Refund rules\n\nUpdated content...");
  const updateIdValue = Number(updateId);
  const canUpdate = Number.isFinite(updateIdValue) && updateIdValue > 0;

  const updateM = useMutation({
    mutationFn: async () => {
      if (!canUpdate) throw new Error("Valid article ID required");
      return supportUpdateKbArticle(String(token), updateIdValue, {
        status: updateStatus.trim() || undefined,
        tags: parseList(updateTags),
        body_md: updateBody.trim() || undefined,
      });
    },
  });

  const [deleteId, setDeleteId] = useState<string>("");
  const deleteIdValue = Number(deleteId);
  const canDelete = Number.isFinite(deleteIdValue) && deleteIdValue > 0;
  const deleteM = useMutation({
    mutationFn: async () => {
      if (!canDelete) throw new Error("Valid article ID required");
      return supportDeleteKbArticle(String(token), deleteIdValue);
    },
  });

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Knowledge Base</div>
          <div className="text-sm text-muted-foreground">
            Manage support articles, visibility, and publishing status.
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link to="/support">Back to Support</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search articles</CardTitle>
              <div className="text-sm text-muted-foreground">Filter by status and query.</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Status</div>
                  <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="">All</option>
                    <option value="published">published</option>
                    <option value="draft">draft</option>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <div className="mb-1 text-xs text-muted-foreground">Query</div>
                  <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search terms" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Per page</div>
                  <Input value={perPage} onChange={(event) => setPerPage(event.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => listQ.refetch()} disabled={listQ.isFetching}>
                  {listQ.isFetching ? "Loading..." : "Search"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStatus("");
                    setQuery("");
                    setPerPage("10");
                  }}
                >
                  Reset
                </Button>
                {listQ.isError ? (
                  <div className="text-sm text-destructive">
                    {(listQ.error as any)?.message ?? "Failed to load articles"}
                  </div>
                ) : null}
              </div>
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
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Tags</th>
                      <th className="px-3 py-2">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row: SupportKbArticleRow) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-t border-border hover:bg-muted/20"
                        onClick={() => {
                          setDetailIdInput(String(row.id));
                        }}
                      >
                        <td className="px-3 py-2 font-medium">#{row.id}</td>
                        <td className="px-3 py-2">{row.title}</td>
                        <td className="px-3 py-2">{row.category ?? "-"}</td>
                        <td className="px-3 py-2">{row.status ?? "-"}</td>
                        <td className="px-3 py-2">{row.tags?.join(", ") ?? "-"}</td>
                        <td className="px-3 py-2">{fmt(row.updated_at)}</td>
                      </tr>
                    ))}
                    {!listQ.isLoading && rows.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                          No articles found.
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
              <CardTitle className="text-base">Article detail</CardTitle>
              <div className="text-sm text-muted-foreground">Load a single article by ID.</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1">
                  <div className="mb-1 text-xs text-muted-foreground">Article ID</div>
                  <Input value={detailIdInput} onChange={(event) => setDetailIdInput(event.target.value)} placeholder="18" />
                </div>
                <Button onClick={() => detailQ.refetch()} disabled={!hasDetailId || detailQ.isFetching}>
                  {detailQ.isFetching ? "Loading..." : "Load"}
                </Button>
              </div>

              {detailQ.isError ? (
                <div className="text-sm text-destructive">
                  {(detailQ.error as any)?.message ?? "Failed to load article"}
                </div>
              ) : null}

              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                {detailQ.data ? (
                  <div className="space-y-2">
                    <div className="text-base font-semibold">{detailQ.data.title}</div>
                    <div className="flex flex-wrap gap-2">
                      {detailQ.data.status ? <Badge variant="secondary">{detailQ.data.status}</Badge> : null}
                      {detailQ.data.visibility ? <Badge variant="outline">{detailQ.data.visibility}</Badge> : null}
                      {detailQ.data.category ? <Badge variant="outline">{detailQ.data.category}</Badge> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated {fmt(detailQ.data.updated_at)} · Created {fmt(detailQ.data.created_at)}
                    </div>
                    <Separator />
                    <pre className="whitespace-pre-wrap text-xs">{detailQ.data.body_md ?? "-"}</pre>
                  </div>
                ) : (
                  <div className="text-muted-foreground">No article loaded.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create article</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Title</div>
                <Input value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Category</div>
                  <Input value={createCategory} onChange={(event) => setCreateCategory(event.target.value)} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Status</div>
                  <Select value={createStatus} onChange={(event) => setCreateStatus(event.target.value)}>
                    <option value="draft">draft</option>
                    <option value="published">published</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Visibility</div>
                  <Select value={createVisibility} onChange={(event) => setCreateVisibility(event.target.value)}>
                    <option value="internal">internal</option>
                    <option value="public">public</option>
                  </Select>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Tags</div>
                  <Input value={createTags} onChange={(event) => setCreateTags(event.target.value)} />
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Body (Markdown)</div>
                <Textarea value={createBody} onChange={(event) => setCreateBody(event.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Applies to (comma separated)</div>
                <Input value={createAppliesTo} onChange={(event) => setCreateAppliesTo(event.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Meta source</div>
                <Input value={createMetaSource} onChange={(event) => setCreateMetaSource(event.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => createM.mutate()} disabled={createM.isPending || !createTitle.trim()}>
                  {createM.isPending ? "Creating..." : "Create"}
                </Button>
                {createM.isError ? (
                  <div className="text-sm text-destructive">{(createM.error as any)?.message ?? "Failed"}</div>
                ) : null}
                {createM.isSuccess ? (
                  <div className="text-sm text-emerald-600">
                    Created article #{createM.data?.id ?? "-"}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Update article</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Article ID</div>
                <Input value={updateId} onChange={(event) => setUpdateId(event.target.value)} placeholder="22" />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Status</div>
                <Select value={updateStatus} onChange={(event) => setUpdateStatus(event.target.value)}>
                  <option value="">unchanged</option>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </Select>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Tags</div>
                <Input value={updateTags} onChange={(event) => setUpdateTags(event.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Body (Markdown)</div>
                <Textarea value={updateBody} onChange={(event) => setUpdateBody(event.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => updateM.mutate()} disabled={updateM.isPending || !canUpdate}>
                  {updateM.isPending ? "Updating..." : "Update"}
                </Button>
                {updateM.isError ? (
                  <div className="text-sm text-destructive">{(updateM.error as any)?.message ?? "Failed"}</div>
                ) : null}
                {updateM.isSuccess ? (
                  <div className="text-sm text-emerald-600">Updated article #{updateM.data?.id ?? "-"}</div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delete article</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Article ID</div>
                <Input value={deleteId} onChange={(event) => setDeleteId(event.target.value)} placeholder="22" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="destructive" onClick={() => deleteM.mutate()} disabled={deleteM.isPending || !canDelete}>
                  {deleteM.isPending ? "Deleting..." : "Delete"}
                </Button>
                {deleteM.isError ? (
                  <div className="text-sm text-destructive">{(deleteM.error as any)?.message ?? "Failed"}</div>
                ) : null}
                {deleteM.isSuccess ? (
                  <div className="text-sm text-emerald-600">Deleted.</div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
