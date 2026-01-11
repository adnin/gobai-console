import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import {
  MerchantProduct,
  merchantCreateProduct,
  merchantDeleteProduct,
  merchantListProducts,
  merchantSubscription,
  merchantUpdateProduct,
  merchantUpdateProductAvailability,
} from "@/features/merchant/api/merchantApi";
import { MerchantTabs } from "@/features/merchant/components/MerchantTabs";

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

export function MerchantProductsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const [qText, setQText] = useState("");

  const sub = useQuery({
    queryKey: ["merchant", "subscription"],
    queryFn: async () => merchantSubscription(String(token)),
    enabled: !!token,
  });

  const products = useQuery({
    queryKey: ["merchant", "products"],
    queryFn: async () => merchantListProducts(String(token)),
    enabled: !!token,
  });

  const items: MerchantProduct[] = products.data?.data ?? products.data?.data?.data ?? products.data ?? [];
  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return items;
    return items.filter((p) => String(p.name ?? "").toLowerCase().includes(t));
  }, [items, qText]);

  const allowed = sub.data?.allowed_products ?? 5;
  const canAdd = items.length < allowed;

  const [editing, setEditing] = useState<MerchantProduct | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  function resetForm() {
    setEditing(null);
    setName("");
    setDescription("");
    setPrice("");
    setStock("");
    setImageUrl("");
    setImageFile(null);
    setRemoveImage(false);
  }

  function loadEdit(p: MerchantProduct) {
    setEditing(p);
    setName(p.name ?? "");
    setDescription(p.description ?? "");
    setPrice(String(p.price ?? ""));
    setStock(String(p.stock ?? ""));
    setImageUrl("");
    setImageFile(null);
    setRemoveImage(false);
  }

  const createM = useMutation({
    mutationFn: async () =>
      merchantCreateProduct(String(token), {
        name: name.trim(),
        description: description.trim() || undefined,
        price: n(price),
        stock: n(stock),
        image_file: imageFile,
        image_url: imageUrl.trim() || undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "products"] });
      await qc.invalidateQueries({ queryKey: ["merchant", "subscription"] });
      resetForm();
    },
  });

  const updateM = useMutation({
    mutationFn: async () =>
      merchantUpdateProduct(String(token), Number(editing?.id), {
        name: name.trim(),
        description: description.trim() || null,
        price: n(price),
        stock: n(stock),
        image_file: imageFile,
        image_url: imageUrl.trim() || null,
        remove_image: removeImage,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "products"] });
      resetForm();
    },
  });

  const delM = useMutation({
    mutationFn: async (productId: number) => merchantDeleteProduct(String(token), productId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "products"] });
      await qc.invalidateQueries({ queryKey: ["merchant", "subscription"] });
    },
  });

  const availM = useMutation({
    mutationFn: async (input: { id: number; v: boolean }) => merchantUpdateProductAvailability(String(token), input.id, input.v),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "products"] });
    },
  });

  const canSubmit = name.trim().length >= 2 && n(price) >= 0 && n(stock) >= 0 && (!!editing || canAdd);

  return (
    <div className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Products</div>
          <div className="text-sm text-muted-foreground">Manage your store catalog (limit: {allowed}).</div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/merchant">Back to Orders</Link>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => products.refetch()} disabled={products.isFetching}>
            {products.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <MerchantTabs />

      {!canAdd && !editing && (
        <div className="mb-4 rounded-lg border border-amber-600/30 bg-amber-600/10 p-3 text-sm">
          Product limit reached ({items.length}/{allowed}). <Link className="underline" to="/merchant/upgrade">Upgrade</Link> to add more.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Catalog</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <Input value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Search by name" />
              <Button variant="secondary" onClick={() => setQText("")}>Clear</Button>
            </div>

            <div className="overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Available</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          {p.image ? (
                            <img src={String(p.image)} alt={String(p.name)} className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-muted" />
                          )}
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">{p.description ?? ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-semibold">₱{n(p.price).toLocaleString()}</td>
                      <td className="px-3 py-2">{n(p.stock).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <button
                          className={
                            "rounded-full border px-3 py-1 text-xs transition " +
                            (p.is_available ? "border-emerald-600/30 bg-emerald-600/10" : "border-border bg-background")
                          }
                          onClick={() => availM.mutate({ id: Number(p.id), v: !p.is_available })}
                          disabled={availM.isPending}
                        >
                          {p.is_available ? "On" : "Off"}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => loadEdit(p)}>
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete ${p.name}?`)) delM.mutate(Number(p.id));
                            }}
                            disabled={delM.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!products.isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        No products.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {(products.isError || delM.isError || availM.isError) && (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                {(products.error as any)?.message ?? (delM.error as any)?.message ?? (availM.error as any)?.message ?? "Request failed"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editing ? `Edit #${editing.id}` : "Add product"}</CardTitle>
            <div className="text-sm text-muted-foreground">Keep names simple. Upload an image for better conversions.</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Name</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 1 Gallon Water" />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Description</div>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="optional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Price</div>
                  <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 50" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Stock</div>
                  <Input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="e.g. 10" />
                </div>
              </div>

              <Separator />

              <div>
                <div className="mb-1 text-xs text-muted-foreground">Image upload</div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
                <div className="mt-2 text-xs text-muted-foreground">Or paste an image URL (optional)</div>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              </div>

              {editing && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
                  <span>Remove existing image</span>
                </label>
              )}

              <Button
                className="w-full"
                onClick={() => (editing ? updateM.mutate() : createM.mutate())}
                disabled={!canSubmit || createM.isPending || updateM.isPending}
              >
                {editing ? (updateM.isPending ? "Saving…" : "Save changes") : createM.isPending ? "Creating…" : "Create"}
              </Button>

              {(createM.isError || updateM.isError) && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  {(createM.error as any)?.message ?? (updateM.error as any)?.message ?? "Save failed"}
                </div>
              )}

              <Button variant="secondary" className="w-full" onClick={resetForm}>
                {editing ? "Cancel" : "Reset"}
              </Button>

              <div className="text-xs text-muted-foreground">
                Tip: Keep only in-stock items as Available. This reduces cancellations.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
