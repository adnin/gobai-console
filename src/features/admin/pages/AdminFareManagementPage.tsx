import * as React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/apiError";
import { hasAnyRole, type Role } from "@/lib/rbac";
import { useToast } from "@/ui/toast/ToastProvider";
import {
  adminEstimateFare,
  adminFareVehicleTypes,
  adminListPlaces,
  adminUpdateFareVehicleType,
  type AdminFareEstimateResponse,
  type AdminFareVehicleType,
} from "@/features/admin/api/adminApi";
import { Calculator, CarTaxiFront, Shield } from "lucide-react";

const ALLOWED_ROLES: Role[] = ["admin", "system"];

type FareDraft = {
  base_fare: string;
  per_km_rate: string;
  wait_rate_per_min: string;
  surcharge: string;
  transaction_fee: string;
  transaction_per_km_fee: string;
};

type FareField = keyof FareDraft;

const FARE_FIELDS: Array<{ key: FareField; label: string; step?: string }> = [
  { key: "base_fare", label: "Base Fare", step: "0.01" },
  { key: "per_km_rate", label: "Per KM Rate", step: "0.01" },
  { key: "wait_rate_per_min", label: "Per Min Rate", step: "0.01" },
  { key: "surcharge", label: "Surcharge", step: "0.01" },
  { key: "transaction_fee", label: "Transaction Fee", step: "0.01" },
  { key: "transaction_per_km_fee", label: "Transaction/KM Fee", step: "0.01" },
];

function toDraft(vehicleType: AdminFareVehicleType): FareDraft {
  return {
    base_fare: String(vehicleType.base_fare ?? 0),
    per_km_rate: String(vehicleType.per_km_rate ?? 0),
    wait_rate_per_min: String(vehicleType.wait_rate_per_min ?? 0),
    surcharge: String(vehicleType.surcharge ?? 0),
    transaction_fee: String(vehicleType.transaction_fee ?? 0),
    transaction_per_km_fee: String(vehicleType.transaction_per_km_fee ?? 0),
  };
}

function parseDraft(draft: FareDraft): Record<FareField, number> | null {
  const parsed = {
    base_fare: Number(draft.base_fare),
    per_km_rate: Number(draft.per_km_rate),
    wait_rate_per_min: Number(draft.wait_rate_per_min),
    surcharge: Number(draft.surcharge),
    transaction_fee: Number(draft.transaction_fee),
    transaction_per_km_fee: Number(draft.transaction_per_km_fee),
  };

  const hasInvalid = Object.values(parsed).some((value) => !Number.isFinite(value) || value < 0);
  if (hasInvalid) return null;

  return parsed;
}

function formatPhp(cents: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format((cents || 0) / 100);
}

export function AdminFareManagementPage() {
  const { token, viewer } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const allowed = hasAnyRole(viewer, ALLOWED_ROLES);

  const [drafts, setDrafts] = React.useState<Record<number, FareDraft>>({});
  const [vehicleTypeId, setVehicleTypeId] = React.useState<string>("");
  const [pickupPlaceId, setPickupPlaceId] = React.useState<string>("");
  const [destinationPlaceId, setDestinationPlaceId] = React.useState<string>("");
  const [estimateResult, setEstimateResult] = React.useState<AdminFareEstimateResponse["data"] | null>(null);

  const vehicleTypesQ = useQuery({
    queryKey: ["admin", "fares", "vehicle-types"],
    enabled: !!token,
    queryFn: async () => adminFareVehicleTypes(String(token)),
    refetchOnWindowFocus: false,
  });

  const placesQ = useQuery({
    queryKey: ["admin", "fares", "places"],
    enabled: !!token,
    queryFn: async () => adminListPlaces(String(token)),
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    const vehicleTypes = vehicleTypesQ.data?.data ?? [];
    if (vehicleTypes.length === 0) return;

    setDrafts((current) => {
      const next = { ...current };
      for (const vehicleType of vehicleTypes) {
        if (!next[vehicleType.id]) {
          next[vehicleType.id] = toDraft(vehicleType);
        }
      }
      return next;
    });

    if (!vehicleTypeId) {
      setVehicleTypeId(String(vehicleTypes[0].id));
    }
  }, [vehicleTypeId, vehicleTypesQ.data?.data]);

  React.useEffect(() => {
    const places = placesQ.data ?? [];
    if (places.length === 0) return;

    if (!pickupPlaceId) {
      setPickupPlaceId(String(places[0].id));
    }
    if (!destinationPlaceId) {
      const second = places[1]?.id ?? places[0].id;
      setDestinationPlaceId(String(second));
    }
  }, [destinationPlaceId, pickupPlaceId, placesQ.data]);

  const updateFareM = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<FareField, number> }) =>
      adminUpdateFareVehicleType(String(token), id, payload),
    onSuccess: async ({ data }) => {
      setDrafts((current) => ({
        ...current,
        [data.id]: toDraft(data),
      }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "fares", "vehicle-types"] });
      toast.ok("Fare rates updated.");
    },
    onError: (error) => {
      toast.err(getErrorMessage(error, "Failed to update fare rates"));
    },
  });

  const estimateM = useMutation({
    mutationFn: async (payload: { vehicle_type_id: number; pickup_place_id: number; destination_place_id: number }) =>
      adminEstimateFare(String(token), payload),
    onSuccess: (response) => {
      setEstimateResult(response.data);
      toast.ok("Fare estimate ready.");
    },
    onError: (error) => {
      toast.err(getErrorMessage(error, "Failed to calculate fare estimate"));
    },
  });

  const updateDraft = (id: number, field: FareField, value: string) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {
          base_fare: "0",
          per_km_rate: "0",
          wait_rate_per_min: "0",
          surcharge: "0",
          transaction_fee: "0",
          transaction_per_km_fee: "0",
        }),
        [field]: value,
      },
    }));
  };

  const saveVehicleTypeRates = (vehicleType: AdminFareVehicleType) => {
    const draft = drafts[vehicleType.id] ?? toDraft(vehicleType);
    const payload = parseDraft(draft);

    if (!payload) {
      toast.err("Fare fields must be valid numbers and cannot be negative.");
      return;
    }

    const confirmed = window.confirm(`Update fare rates for ${vehicleType.name}?`);
    if (!confirmed) return;

    updateFareM.mutate({ id: vehicleType.id, payload });
  };

  const runEstimate = () => {
    const selectedVehicleTypeId = Number(vehicleTypeId);
    const selectedPickupPlaceId = Number(pickupPlaceId);
    const selectedDestinationPlaceId = Number(destinationPlaceId);

    if (!selectedVehicleTypeId || !selectedPickupPlaceId || !selectedDestinationPlaceId) {
      toast.warn("Please select vehicle type, pickup, and destination.");
      return;
    }

    if (selectedPickupPlaceId === selectedDestinationPlaceId) {
      toast.warn("Pickup and destination must be different.");
      return;
    }

    estimateM.mutate({
      vehicle_type_id: selectedVehicleTypeId,
      pickup_place_id: selectedPickupPlaceId,
      destination_place_id: selectedDestinationPlaceId,
    });
  };

  if (!allowed) {
    return (
      <div className="p-6">
        <EmptyState
          title="Access restricted"
          description="You need admin access to manage fare rates."
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

  const vehicleTypes = vehicleTypesQ.data?.data ?? [];
  const places = placesQ.data ?? [];
  const isLoading = vehicleTypesQ.isLoading || placesQ.isLoading;
  const hasError = vehicleTypesQ.isError || placesQ.isError;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Fare Management</h1>
          <div className="text-sm text-muted-foreground">
            Configure vehicle fare rates and run map-based sample fare calculations.
          </div>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/admin">Admin Home</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <CarTaxiFront className="size-4" />
              Vehicle Fare Rates
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void vehicleTypesQ.refetch();
                void placesQ.refetch();
              }}
              disabled={vehicleTypesQ.isFetching || placesQ.isFetching}
            >
              {vehicleTypesQ.isFetching || placesQ.isFetching ? "Refreshing..." : "Refresh"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading fare data...</div>
          ) : vehicleTypes.length === 0 ? (
            <EmptyState
              title="No vehicle types"
              description="Create at least one vehicle type before configuring fare rates."
              icon={CarTaxiFront}
            />
          ) : (
            <div className="space-y-3">
              {vehicleTypes.map((vehicleType) => {
                const draft = drafts[vehicleType.id] ?? toDraft(vehicleType);
                return (
                  <div key={vehicleType.id} className="rounded-xl border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="font-medium">{vehicleType.name}</div>
                      <Badge variant={vehicleType.is_active ? "secondary" : "danger"}>
                        {vehicleType.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {FARE_FIELDS.map((field) => (
                        <label key={field.key} className="space-y-1">
                          <span className="text-xs text-muted-foreground">{field.label}</span>
                          <Input
                            type="number"
                            min={0}
                            step={field.step ?? "0.01"}
                            value={draft[field.key]}
                            onChange={(event) => updateDraft(vehicleType.id, field.key, event.target.value)}
                            disabled={updateFareM.isPending}
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        onClick={() => saveVehicleTypeRates(vehicleType)}
                        disabled={updateFareM.isPending}
                      >
                        {updateFareM.isPending ? "Saving..." : "Save Rates"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="size-4" />
            Fare Estimate Example (Mapbox)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Vehicle Type</span>
              <select
                value={vehicleTypeId}
                onChange={(event) => setVehicleTypeId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select vehicle</option>
                {vehicleTypes.map((vehicleType) => (
                  <option key={vehicleType.id} value={vehicleType.id}>
                    {vehicleType.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Pickup Place</span>
              <select
                value={pickupPlaceId}
                onChange={(event) => setPickupPlaceId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select pickup</option>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name ?? `Place #${place.id}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Destination Place</span>
              <select
                value={destinationPlaceId}
                onChange={(event) => setDestinationPlaceId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select destination</option>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name ?? `Place #${place.id}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <Button onClick={runEstimate} disabled={estimateM.isPending || isLoading}>
              {estimateM.isPending ? "Calculating..." : "Calculate Estimate"}
            </Button>
          </div>

          {estimateResult ? (
            <>
              <Separator />
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                <div className="font-medium">
                  {estimateResult.pickup.name ?? "Pickup"} → {estimateResult.destination.name ?? "Destination"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Distance: {estimateResult.route.distance_km} km • Duration: {estimateResult.route.duration_min} min
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Base Fare</div>
                  <div className="font-medium">{formatPhp(estimateResult.breakdown.base_fare_cents)}</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Distance Charge</div>
                  <div className="font-medium">{formatPhp(estimateResult.breakdown.distance_charge_cents)}</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Time Charge</div>
                  <div className="font-medium">{formatPhp(estimateResult.breakdown.time_charge_cents)}</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Surcharge</div>
                  <div className="font-medium">{formatPhp(estimateResult.breakdown.surcharge_cents)}</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Transaction Fee</div>
                  <div className="font-medium">{formatPhp(estimateResult.breakdown.transaction_fee_cents)}</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Transaction Distance Fee</div>
                  <div className="font-medium">{formatPhp(estimateResult.breakdown.transaction_distance_fee_cents)}</div>
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
                <div className="text-xs text-muted-foreground">Estimated Total</div>
                <div className="text-lg font-semibold">{formatPhp(estimateResult.breakdown.total_cents)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{estimateResult.formula}</div>
              </div>
            </>
          ) : null}

          {(estimateM.isError || updateFareM.isError || hasError) ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {getErrorMessage(
                (vehicleTypesQ.error as unknown) ?? (placesQ.error as unknown) ?? updateFareM.error ?? estimateM.error,
                "Failed to load fare management data."
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminFareManagementPage;
