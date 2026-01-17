import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { getErrorMessage } from "@/lib/apiError";
import { trackEvent, trackScreenView } from "@/lib/analytics";
import { useToast } from "@/ui/toast/ToastProvider";
import {
  partnerAssignDriver,
  partnerCreateOrder,
  partnerListDrivers,
  partnerListOrders,
  partnerOfferDriver,
  partnerPodClose,
  partnerTracking,
  type PartnerCreateOrderInput,
  type PartnerDispatchOrder,
  type PartnerTracking as PartnerTrackingData,
} from "@/features/dispatch/api/partnerApi";
import type { ApiDriverProfile, ApiDeliveryOrder } from "@/features/dispatch/api/opsApi";
import { AlertTriangle, CheckCircle2, MapPin, Truck, User } from "lucide-react";

const TAB_OPTIONS = [
  { id: "create", label: "Create Job" },
  { id: "assign", label: "Assignment" },
  { id: "tracking", label: "Tracking" },
] as const;

type TabId = (typeof TAB_OPTIONS)[number]["id"];

type FieldErrors = Record<string, string>;

function parseFieldErrors(err: unknown): FieldErrors {
  if (!(err instanceof ApiError)) return {};
  const payload = err.payload as any;
  const errors = payload?.errors;
  if (!errors || typeof errors !== "object") return {};
  const out: FieldErrors = {};
  for (const [key, value] of Object.entries(errors)) {
    if (Array.isArray(value) && value[0]) out[key] = String(value[0]);
    else if (typeof value === "string" && value.trim()) out[key] = value;
  }
  return out;
}

function isTenantError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  const payload = err.payload as any;
  if (payload?.errors?.tenant_id) return true;
  return String(err.message || "").toLowerCase().includes("tenant");
}

function getDriverName(driver: ApiDriverProfile): string {
  const user = driver.user as any;
  if (typeof user === "string") return user;
  return user?.name ?? user?.email ?? `Driver #${driver.user_id ?? driver.id}`;
}

function orderLabel(order: ApiDeliveryOrder | PartnerDispatchOrder): string {
  const ref = (order as any)?.reference_no ?? "";
  return ref ? `#${ref}` : `Order ${order.id}`;
}

function toNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function PartnerDispatchSaasPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

  const tab = (params.get("tab") as TabId) || "create";

  React.useEffect(() => {
    const screenName = tab === "create" ? "CreateJob" : tab === "assign" ? "Assignment" : "Tracking";
    trackScreenView(screenName, { module: "dispatch" });
  }, [tab]);

  const setTab = (next: TabId) => {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dispatch SaaS</CardTitle>
          <div className="text-sm text-muted-foreground">
            Create jobs, assign drivers, track status, and close POD for your fleet.
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TAB_OPTIONS.map((t) => (
              <Button
                key={t.id}
                variant={tab === t.id ? "default" : "secondary"}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {tab === "create" ? (
        <CreateJobSection token={token} onCreated={() => queryClient.invalidateQueries({ queryKey: ["partner-orders"] })} />
      ) : null}
      {tab === "assign" ? (
        <AssignmentSection token={token} />
      ) : null}
      {tab === "tracking" ? (
        <TrackingSection token={token} />
      ) : null}
    </div>
  );
}

function CreateJobSection({ token, onCreated }: { token: string | null; onCreated: () => void }) {
  const toast = useToast();
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<PartnerDispatchOrder | null>(null);

  const [form, setForm] = React.useState({
    pickup_address: "",
    pickup_latitude: "",
    pickup_longitude: "",
    dropoff_address: "",
    dropoff_latitude: "",
    dropoff_longitude: "",
    vehicle_type_id: "",
    distance: "",
    total_driver_fare: "",
    total_transaction_fare: "",
    total_price: "",
    payment_method: "",
    payment_status: "",
    trip_type: "oneway",
    flow_type: "transport",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async (payload: PartnerCreateOrderInput) => {
      if (!token) throw new Error("Missing token");
      return partnerCreateOrder(token, payload);
    },
    onSuccess: (res) => {
      setCreated(res.data);
      toast.show("ok", "Job created successfully.");
      trackEvent("dispatch_create_job", { status: "success" });
      onCreated();
    },
    onError: (err) => {
      setFieldErrors(parseFieldErrors(err));
      const msg = isTenantError(err)
        ? "You do not have access to this fleet."
        : getErrorMessage(err, "Failed to create job.");
      setFormError(msg);
      trackEvent("dispatch_create_job", { status: "error" });
    },
  });

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const required: Array<keyof typeof form> = [
      "pickup_address",
      "pickup_latitude",
      "pickup_longitude",
      "dropoff_address",
      "dropoff_latitude",
      "dropoff_longitude",
      "vehicle_type_id",
    ];
    const missing: FieldErrors = {};
    for (const key of required) {
      if (!form[key]?.trim()) missing[key] = "This field is required.";
    }
    if (Object.keys(missing).length > 0) {
      setFieldErrors(missing);
      setFormError("Please fill all required fields.");
      return;
    }

    const payload: PartnerCreateOrderInput = {
      pickup_address: form.pickup_address.trim(),
      pickup_latitude: Number(form.pickup_latitude),
      pickup_longitude: Number(form.pickup_longitude),
      dropoff_address: form.dropoff_address.trim(),
      dropoff_latitude: Number(form.dropoff_latitude),
      dropoff_longitude: Number(form.dropoff_longitude),
      vehicle_type_id: Number(form.vehicle_type_id),
      distance: toNumber(form.distance),
      total_driver_fare: toNumber(form.total_driver_fare),
      total_transaction_fare: toNumber(form.total_transaction_fare),
      total_price: toNumber(form.total_price),
      payment_method: (form.payment_method || null) as PartnerCreateOrderInput["payment_method"],
      payment_status: form.payment_status || null,
      trip_type: (form.trip_type || null) as PartnerCreateOrderInput["trip_type"],
      flow_type: (form.flow_type || null) as PartnerCreateOrderInput["flow_type"],
      notes: form.notes || null,
    };

    mutation.mutate(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" /> Create job
        </CardTitle>
        <div className="text-sm text-muted-foreground">Submit pickup/dropoff details and pricing to create a job.</div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Pickup address *</div>
              <Input
                value={form.pickup_address}
                onChange={(e) => setField("pickup_address", e.target.value)}
                aria-invalid={!!fieldErrors.pickup_address}
                className={fieldErrors.pickup_address ? "border-destructive" : undefined}
              />
              {fieldErrors.pickup_address ? <div className="mt-1 text-xs text-destructive">{fieldErrors.pickup_address}</div> : null}
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Dropoff address *</div>
              <Input
                value={form.dropoff_address}
                onChange={(e) => setField("dropoff_address", e.target.value)}
                aria-invalid={!!fieldErrors.dropoff_address}
                className={fieldErrors.dropoff_address ? "border-destructive" : undefined}
              />
              {fieldErrors.dropoff_address ? <div className="mt-1 text-xs text-destructive">{fieldErrors.dropoff_address}</div> : null}
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Pickup latitude *</div>
              <Input
                value={form.pickup_latitude}
                onChange={(e) => setField("pickup_latitude", e.target.value)}
                inputMode="decimal"
                aria-invalid={!!fieldErrors.pickup_latitude}
                className={fieldErrors.pickup_latitude ? "border-destructive" : undefined}
              />
              {fieldErrors.pickup_latitude ? <div className="mt-1 text-xs text-destructive">{fieldErrors.pickup_latitude}</div> : null}
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Pickup longitude *</div>
              <Input
                value={form.pickup_longitude}
                onChange={(e) => setField("pickup_longitude", e.target.value)}
                inputMode="decimal"
                aria-invalid={!!fieldErrors.pickup_longitude}
                className={fieldErrors.pickup_longitude ? "border-destructive" : undefined}
              />
              {fieldErrors.pickup_longitude ? <div className="mt-1 text-xs text-destructive">{fieldErrors.pickup_longitude}</div> : null}
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Dropoff latitude *</div>
              <Input
                value={form.dropoff_latitude}
                onChange={(e) => setField("dropoff_latitude", e.target.value)}
                inputMode="decimal"
                aria-invalid={!!fieldErrors.dropoff_latitude}
                className={fieldErrors.dropoff_latitude ? "border-destructive" : undefined}
              />
              {fieldErrors.dropoff_latitude ? <div className="mt-1 text-xs text-destructive">{fieldErrors.dropoff_latitude}</div> : null}
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Dropoff longitude *</div>
              <Input
                value={form.dropoff_longitude}
                onChange={(e) => setField("dropoff_longitude", e.target.value)}
                inputMode="decimal"
                aria-invalid={!!fieldErrors.dropoff_longitude}
                className={fieldErrors.dropoff_longitude ? "border-destructive" : undefined}
              />
              {fieldErrors.dropoff_longitude ? <div className="mt-1 text-xs text-destructive">{fieldErrors.dropoff_longitude}</div> : null}
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Vehicle type ID *</div>
              <Input
                value={form.vehicle_type_id}
                onChange={(e) => setField("vehicle_type_id", e.target.value)}
                inputMode="numeric"
                aria-invalid={!!fieldErrors.vehicle_type_id}
                className={fieldErrors.vehicle_type_id ? "border-destructive" : undefined}
              />
              {fieldErrors.vehicle_type_id ? <div className="mt-1 text-xs text-destructive">{fieldErrors.vehicle_type_id}</div> : null}
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Distance (km)</div>
              <Input value={form.distance} onChange={(e) => setField("distance", e.target.value)} inputMode="decimal" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Total driver fare</div>
              <Input value={form.total_driver_fare} onChange={(e) => setField("total_driver_fare", e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Total transaction fare</div>
              <Input value={form.total_transaction_fare} onChange={(e) => setField("total_transaction_fare", e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Total price</div>
              <Input value={form.total_price} onChange={(e) => setField("total_price", e.target.value)} inputMode="numeric" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Payment method</div>
              <Select value={form.payment_method} onChange={(e) => setField("payment_method", e.target.value)}>
                <option value="">Select</option>
                <option value="gcash_qr">GCash QR</option>
                <option value="cod">Cash on delivery</option>
                <option value="wallet">Wallet</option>
              </Select>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Payment status</div>
              <Input value={form.payment_status} onChange={(e) => setField("payment_status", e.target.value)} />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Trip type</div>
              <Select value={form.trip_type} onChange={(e) => setField("trip_type", e.target.value)}>
                <option value="oneway">One-way</option>
                <option value="roundtrip">Round-trip</option>
              </Select>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Flow type</div>
              <Select value={form.flow_type} onChange={(e) => setField("flow_type", e.target.value)}>
                <option value="transport">Transport</option>
                <option value="parcel">Parcel</option>
                <option value="store">Store</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <div className="mb-1 text-xs text-muted-foreground">Notes</div>
              <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={3} />
            </div>
          </div>

          {formError ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">{formError}</div> : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create job"}
            </Button>
            {mutation.isPending ? <span className="text-xs text-muted-foreground">Submitting request…</span> : null}
          </div>
        </form>

        {created ? (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Job created
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Order ID: {created.id}</div>
            <div className="text-xs text-muted-foreground">Reference: {created.reference_no}</div>
            <div className="text-xs text-muted-foreground">Status: {created.status}</div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AssignmentSection({ token }: { token: string | null }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [orderIdInput, setOrderIdInput] = React.useState<string>("");
  const [driverIdInput, setDriverIdInput] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const ordersQuery = useQuery({
    queryKey: ["partner-orders", "recent"],
    enabled: !!token,
    queryFn: async () => {
      if (!token) return [] as ApiDeliveryOrder[];
      const res = await partnerListOrders(token, { today: true, per_page: 50, page: 1 });
      return res.data ?? [];
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const driversQuery = useQuery({
    queryKey: ["partner-drivers", "eligible"],
    enabled: !!token,
    queryFn: async () => {
      if (!token) return [] as ApiDriverProfile[];
      const res = await partnerListDrivers(token, { status: "approved", per_page: 100, page: 1 });
      return res.data ?? [];
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const selectedOrderId = Number(orderIdInput) || 0;
  const selectedDriverId = Number(driverIdInput) || 0;

  const eligibleDriverIds = React.useMemo(() => {
    const ids = new Set<number>();
    (driversQuery.data ?? []).forEach((d) => {
      const id = Number((d as any).user_id ?? d.id ?? 0);
      if (id) ids.add(id);
    });
    return ids;
  }, [driversQuery.data]);

  const hasDriverList = eligibleDriverIds.size > 0;
  const isDriverEligible = !selectedDriverId ? false : !hasDriverList || eligibleDriverIds.has(selectedDriverId);

  const offerMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Missing token");
      return partnerOfferDriver(token, { orderId: selectedOrderId, driverId: selectedDriverId });
    },
    onSuccess: () => {
      toast.show("ok", "Auto-assign offer sent.");
      trackEvent("assignment_auto_assign", { status: "success" });
      queryClient.invalidateQueries({ queryKey: ["partner-orders"] });
    },
    onError: (err) => {
      toast.apiErr(err, "Failed to auto-assign driver.");
      trackEvent("assignment_auto_assign", { status: "error" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Missing token");
      return partnerAssignDriver(token, { orderId: selectedOrderId, driverId: selectedDriverId, note: note || undefined });
    },
    onSuccess: () => {
      toast.show("ok", "Driver assigned successfully.");
      trackEvent("assignment_manual_assign", { status: "success" });
      trackEvent("assignment_override_confirmed", { status: "success" });
      queryClient.invalidateQueries({ queryKey: ["partner-orders"] });
      setConfirmOpen(false);
    },
    onError: (err) => {
      toast.apiErr(err, "Failed to assign driver.");
      trackEvent("assignment_manual_assign", { status: "error" });
    },
  });

  const orderError = ordersQuery.error as any;
  const driverError = driversQuery.error as any;

  const showTenantError = isTenantError(orderError) || isTenantError(driverError);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4" /> Assignment
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Choose an order and assign an eligible driver. Manual overrides require confirmation.
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showTenantError ? (
          <EmptyState
            title="Tenant access required"
            description="You do not have access to this fleet. Ask an admin to grant access."
            icon={AlertTriangle}
          />
        ) : null}

        {!showTenantError ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Order</div>
              {ordersQuery.isLoading ? (
                <div className="h-9 w-full animate-pulse rounded bg-muted/50" />
              ) : ordersQuery.isError ? (
                <EmptyState
                  title="Unable to load orders"
                  description={getErrorMessage(orderError, "Try refreshing.")}
                  icon={AlertTriangle}
                  actions={<Button variant="secondary" onClick={() => ordersQuery.refetch()}>Retry</Button>}
                />
              ) : ordersQuery.data?.length ? (
                <Select value={orderIdInput} onChange={(e) => setOrderIdInput(e.target.value)}>
                  <option value="">Select an order</option>
                  {ordersQuery.data.map((order) => (
                    <option key={order.id} value={String(order.id)}>
                      {orderLabel(order)} · {order.status ?? ""}
                    </option>
                  ))}
                </Select>
              ) : (
                <EmptyState
                  title="No orders available"
                  description="Create a job first to start assigning drivers."
                  icon={Truck}
                />
              )}
            </div>

            <div>
              <div className="mb-1 text-xs text-muted-foreground">Driver</div>
              {driversQuery.isLoading ? (
                <div className="h-9 w-full animate-pulse rounded bg-muted/50" />
              ) : driversQuery.isError && (driverError?.status === 403 || driverError?.status === 401) ? (
                <div className="space-y-2">
                  <Input
                    value={driverIdInput}
                    onChange={(e) => setDriverIdInput(e.target.value)}
                    placeholder="Enter driver ID"
                    inputMode="numeric"
                  />
                  <div className="text-xs text-muted-foreground">
                    Driver list access is restricted. Enter an eligible driver ID to assign.
                  </div>
                </div>
              ) : driversQuery.isError ? (
                <EmptyState
                  title="Unable to load drivers"
                  description={getErrorMessage(driverError, "Try refreshing.")}
                  icon={AlertTriangle}
                  actions={<Button variant="secondary" onClick={() => driversQuery.refetch()}>Retry</Button>}
                />
              ) : driversQuery.data?.length ? (
                <Select value={driverIdInput} onChange={(e) => setDriverIdInput(e.target.value)}>
                  <option value="">Select a driver</option>
                  {driversQuery.data.map((driver) => {
                    const id = String((driver as any).user_id ?? driver.id);
                    return (
                      <option key={id} value={id}>
                        {getDriverName(driver)} · #{id}
                      </option>
                    );
                  })}
                </Select>
              ) : (
                <EmptyState
                  title="No eligible drivers"
                  description="Ask a fleet admin to add or approve drivers."
                  icon={User}
                />
              )}
              {driverIdInput && !isDriverEligible ? (
                <div className="mt-1 text-xs text-destructive">Driver is not eligible for this fleet.</div>
              ) : null}
            </div>
          </div>
        ) : null}

        {!showTenantError ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => offerMutation.mutate()}
              disabled={!selectedOrderId || !selectedDriverId || !isDriverEligible || offerMutation.isPending}
            >
              {offerMutation.isPending ? "Offering…" : "Auto-assign (offer)"}
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!selectedOrderId || !selectedDriverId || !isDriverEligible}
            >
              Manual override
            </Button>
          </div>
        ) : null}

        <Dialog isOpen={confirmOpen} onClose={() => (!assignMutation.isPending ? setConfirmOpen(false) : null)}>
          <DialogHeader>
            <DialogTitle>Confirm manual assignment</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <div className="space-y-3 text-sm">
              <div>
                This will override any existing assignment and immediately lock in the selected driver.
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Reason (optional)</div>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={assignMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending}>
              {assignMutation.isPending ? "Assigning…" : "Confirm assignment"}
            </Button>
          </DialogFooter>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function TrackingSection({ token }: { token: string | null }) {
  const toast = useToast();
  const [orderIdInput, setOrderIdInput] = React.useState<string>("");
  const [podNotes, setPodNotes] = React.useState<string>("");
  const [podLat, setPodLat] = React.useState<string>("");
  const [podLng, setPodLng] = React.useState<string>("");

  const ordersQuery = useQuery({
    queryKey: ["partner-orders", "tracking"],
    enabled: !!token,
    queryFn: async () => {
      if (!token) return [] as ApiDeliveryOrder[];
      const res = await partnerListOrders(token, { today: true, per_page: 50, page: 1 });
      return res.data ?? [];
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const orderId = Number(orderIdInput) || 0;

  const trackingQuery = useQuery<{ data: PartnerTrackingData }>({
    queryKey: ["partner-tracking", orderId],
    enabled: !!token && orderId > 0,
    queryFn: async () => {
      if (!token || !orderId) throw new Error("Missing order");
      return partnerTracking(token, orderId);
    },
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const podMutation = useMutation({
    mutationFn: async () => {
      if (!token || !orderId) throw new Error("Missing order");
      return partnerPodClose(token, orderId, {
        latitude: toNumber(podLat),
        longitude: toNumber(podLng),
        pod_notes: podNotes || null,
      });
    },
    onSuccess: () => {
      toast.show("ok", "POD close submitted.");
      trackEvent("pod_close_submitted", { status: "success" });
      trackingQuery.refetch();
    },
    onError: (err) => {
      toast.apiErr(err, "Failed to submit POD close.");
      trackEvent("pod_close_submitted", { status: "error" });
    },
  });

  const trackingError = trackingQuery.error as any;
  const showTenantError = isTenantError(trackingError);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4" /> Tracking & POD
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Track assignment status and close proof of delivery when complete.
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showTenantError ? (
          <EmptyState
            title="Tenant access required"
            description="You do not have access to this fleet. Ask an admin to grant access."
            icon={AlertTriangle}
          />
        ) : null}

        {!showTenantError ? (
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Order</div>
            {ordersQuery.isLoading ? (
              <div className="h-9 w-full animate-pulse rounded bg-muted/50" />
            ) : ordersQuery.isError ? (
              <EmptyState
                title="Unable to load orders"
                description={getErrorMessage(ordersQuery.error, "Try refreshing.")}
                icon={AlertTriangle}
                actions={<Button variant="secondary" onClick={() => ordersQuery.refetch()}>Retry</Button>}
              />
            ) : ordersQuery.data?.length ? (
              <Select value={orderIdInput} onChange={(e) => setOrderIdInput(e.target.value)}>
                <option value="">Select an order</option>
                {ordersQuery.data.map((order) => (
                  <option key={order.id} value={String(order.id)}>
                    {orderLabel(order)} · {order.status ?? ""}
                  </option>
                ))}
              </Select>
            ) : (
              <EmptyState
                title="No orders available"
                description="Create a job first to see tracking information."
                icon={Truck}
              />
            )}
          </div>
        ) : null}

        {!showTenantError && orderId > 0 ? (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm">Tracking status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trackingQuery.isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-muted/50" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted/50" />
                  <div className="h-4 w-56 animate-pulse rounded bg-muted/50" />
                </div>
              ) : trackingQuery.isError ? (
                <EmptyState
                  title={trackingError?.status === 404 ? "Order not found" : "Unable to load tracking"}
                  description={getErrorMessage(trackingError, "Try refreshing.")}
                  icon={AlertTriangle}
                  actions={<Button variant="secondary" onClick={() => trackingQuery.refetch()}>Retry</Button>}
                />
              ) : trackingQuery.data ? (
                <TrackingSummary data={trackingQuery.data.data} />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {!showTenantError && orderId > 0 ? (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm">POD close</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Latitude</div>
                  <Input value={podLat} onChange={(e) => setPodLat(e.target.value)} inputMode="decimal" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Longitude</div>
                  <Input value={podLng} onChange={(e) => setPodLng(e.target.value)} inputMode="decimal" />
                </div>
                <div className="md:col-span-2">
                  <div className="mb-1 text-xs text-muted-foreground">POD notes</div>
                  <Textarea value={podNotes} onChange={(e) => setPodNotes(e.target.value)} rows={3} />
                </div>
              </div>
              <Button onClick={() => podMutation.mutate()} disabled={podMutation.isPending}>
                {podMutation.isPending ? "Submitting…" : "Submit POD close"}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TrackingSummary({ data }: { data: PartnerTrackingData }) {
  const driver = data.driver;
  const podState = data.timestamps?.delivered_at || data.timestamps?.completed_at ? "POD closed" : "Pending POD";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <div className="text-xs text-muted-foreground">Order</div>
        <div className="text-sm font-semibold">{data.reference_no}</div>
        <div className="text-xs text-muted-foreground">Status: {data.status}</div>
        <div className="text-xs text-muted-foreground">Dispatch: {data.dispatch_status}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Driver</div>
        <div className="text-sm font-semibold">{driver ? driver.name : "Unassigned"}</div>
        <div className="text-xs text-muted-foreground">Driver status: {driver?.status ?? "—"}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Assignment</div>
        <div className="text-sm">Assigned at: {data.timestamps?.assigned_at ?? "—"}</div>
        <div className="text-sm">Delivered at: {data.timestamps?.delivered_at ?? "—"}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">POD state</div>
        <div className="text-sm">{podState}</div>
        <div className="text-sm">Completed at: {data.timestamps?.completed_at ?? "—"}</div>
      </div>
    </div>
  );
}

