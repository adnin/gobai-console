import * as React from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/apiError";
import { hasAnyRole, type Role } from "@/lib/rbac";
import { adminImportPlacesJson, type AdminPlacesImportSummary } from "@/features/admin/api/adminApi";
import { Database, Shield } from "lucide-react";
import { useToast } from "@/ui/toast/ToastProvider";

const ALLOWED_ROLES: Role[] = ["admin", "system"];

function humanFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function AdminPlacesImportPage() {
  const { token, viewer } = useAuth();
  const toast = useToast();
  const allowed = hasAnyRole(viewer, ALLOWED_ROLES);

  const [file, setFile] = React.useState<File | null>(null);
  const [lastSummary, setLastSummary] = React.useState<AdminPlacesImportSummary | null>(null);

  const importM = useMutation({
    mutationFn: async (jsonFile: File) => {
      if (!token) {
        throw new Error("You are not authenticated.");
      }
      return adminImportPlacesJson(token, jsonFile);
    },
    onSuccess: (payload) => {
      setLastSummary(payload.data);
      toast.ok(
        `Import complete: ${payload.data.created} created, ${payload.data.updated} updated, ${payload.data.skipped} skipped.`
      );
    },
    onError: (err) => {
      toast.err(getErrorMessage(err, "Failed to import places JSON"));
    },
  });

  const resetFileInput = () => {
    setFile(null);
  };

  const submit = () => {
    if (!file) {
      toast.warn("Please select a JSON file first.");
      return;
    }
    if (!token) {
      toast.err("You are not authenticated.");
      return;
    }

    const confirmed = window.confirm(
      `Import places from "${file.name}"?\nExisting places with matching name will be updated.`
    );
    if (!confirmed) return;

    importM.mutate(file);
  };

  if (!allowed) {
    return (
      <div className="p-6">
        <EmptyState
          title="Access restricted"
          description="You need admin access to import places."
          icon={Shield}
          actions={
            <Button asChild>
              <a href="/login">Sign in</a>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Places JSON Import</h1>
          <div className="text-sm text-muted-foreground">
            Upload a `.json` file with `pins[]`. Existing places are updated by name; new names are created.
          </div>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/admin">Admin Home</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Select JSON file</div>
            <Input
              type="file"
              accept=".json,application/json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={importM.isPending}
            />
          </div>

          {file ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <div className="font-medium">{file.name}</div>
              <div className="text-xs text-muted-foreground">Size: {humanFileSize(file.size)}</div>
            </div>
          ) : (
            <EmptyState
              title="No file selected"
              description="Choose a places JSON export to start importing."
              icon={Database}
              className="py-6"
            />
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={submit} disabled={!file || importM.isPending || !token}>
              {importM.isPending ? "Uploading..." : "Import places"}
            </Button>
            <Button variant="secondary" onClick={resetFileInput} disabled={importM.isPending || !file}>
              Clear selection
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Required format: object with `pins` array. Each pin should include `name`, `lat`, `lng`. `tags` are stored in
            `meta.tags`.
          </div>

          {importM.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {getErrorMessage(importM.error, "Import failed")}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest Result</CardTitle>
        </CardHeader>
        <CardContent>
          {!lastSummary ? (
            <div className="text-sm text-muted-foreground">No import executed yet.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-md border border-border bg-muted/10 p-3">
                  <div className="text-xs text-muted-foreground">Processed</div>
                  <div className="text-lg font-semibold">{lastSummary.processed}</div>
                </div>
                <div className="rounded-md border border-border bg-muted/10 p-3">
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="text-lg font-semibold">{lastSummary.created}</div>
                </div>
                <div className="rounded-md border border-border bg-muted/10 p-3">
                  <div className="text-xs text-muted-foreground">Updated</div>
                  <div className="text-lg font-semibold">{lastSummary.updated}</div>
                </div>
                <div className="rounded-md border border-border bg-muted/10 p-3">
                  <div className="text-xs text-muted-foreground">Skipped</div>
                  <div className="text-lg font-semibold">{lastSummary.skipped}</div>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Created: {lastSummary.created}</Badge>
                <Badge variant="secondary">Updated: {lastSummary.updated}</Badge>
                <Badge variant="secondary">Skipped: {lastSummary.skipped}</Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminPlacesImportPage;
