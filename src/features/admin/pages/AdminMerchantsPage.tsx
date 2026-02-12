import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth";
import {
  adminApproveMerchant,
  adminListPlaces,
  adminMerchantShow,
  adminMerchantsPending,
  adminUpdateStoreAssignment,
  adminUpdateStoreMetaTags,
  adminRejectMerchant,
  adminApproveMerchantDocument,
  adminRejectMerchantDocument,
} from "@/features/admin/api/adminApi";
import { ShieldOff, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/ui/toast/ToastProvider";
import { getErrorMessage } from "@/lib/apiError";


const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
const PUBLIC_BASE = String(API_BASE).replace(/\/api(?:\/v\d+)?\/?$/, "");
const API_BASE_URL = (() => {
  try {
    return new URL(PUBLIC_BASE);
  } catch {
    return null;
  }
})();

const shouldProxyDocuments = Boolean((import.meta as any).env?.DEV && typeof window !== "undefined" && API_BASE_URL && window.location.origin !== API_BASE_URL.origin);

function resolveDocumentUrl(path?: string | null): string | null {
  if (!path) return null;
  const trimmed = String(path).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    // Force all signed URLs through the API origin so Sanctum cookies (or dev proxies) apply.
    try {
      const provided = new URL(trimmed);
      const base = API_BASE_URL;
      if (base && provided.origin === base.origin) {
        if (shouldProxyDocuments) {
          return `${provided.pathname}${provided.search}` || "/";
        }
        return trimmed;
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }

  const normalized = (() => {
    if (trimmed.startsWith("/")) return trimmed;
    if (trimmed.startsWith("storage/") || trimmed.startsWith("public/")) return `/${trimmed}`;
    return `/storage/${trimmed.replace(/^\/+/, "")}`;
  })();

  if (shouldProxyDocuments) return normalized;

  const base = PUBLIC_BASE.replace(/\/$/, "");
  return `${base}${normalized}`;
}

type PendingMerchantRow = {
  merchantId: number;
  accountId: number;
  storeName: string;
  registrationNumber: string | null;
  dtiCertificatePath: string | null;
  dtiDocumentStatus: string | null;
  dtiDocumentId: number | null;
  ownerName: string;
  ownerEmail: string | null;
  ownerPhone: string | null;
  createdAtRaw: string | null;
  createdAtDisplay: string;
  documentsCount: number;
  status: string | null;
};

type DocModalState = {
  isOpen: boolean;
  action: "" | "approve" | "reject";
  documentId: number | null;
  merchant: PendingMerchantRow | null;
  reason: string;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function normalizeStatus(status?: string | null) {
  return String(status ?? "").trim().toLowerCase();
}

function isDtiApproved(status?: string | null) {
  return normalizeStatus(status) === "approved";
}

function formatStatusLabel(status?: string | null) {
  const normalized = normalizeStatus(status);
  if (!normalized) return "pending";
  return normalized.replace(/_/g, " ");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return dateFormatter.format(date);
  } catch {
    return value;
  }
}

function pickDisplayString(values: unknown[], fallback = "—"): string {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length) return trimmed;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return fallback;
}

function pickOptionalString(values: unknown[]): string | null {
  const text = pickDisplayString(values, "");
  return text ? text : null;
}

function toDisplayRow(row: any): PendingMerchantRow {
  const user = row?.user ?? {};
  const createdSource = row?.applied_at ?? row?.created_at ?? row?.updated_at ?? null;
  const documents: any[] = Array.isArray(row?.documents) ? row.documents : [];
  const dtiDocument = documents.find((doc) => doc?.type === "dti_certificate") ?? null;
  const dtiStatus = pickOptionalString([dtiDocument?.status]);
  const dtiPath = pickOptionalString([row?.dti_certificate_path, dtiDocument?.path]);
  const dtiDocumentId = Number(dtiDocument?.id ?? 0) || null;

  return {
    merchantId: Number(row?.id ?? 0) || 0,
    accountId: Number(row?.user_id ?? user?.id ?? row?.id ?? 0) || 0,
    storeName: pickDisplayString([
      row?.business_name,
      row?.store_name,
      row?.name,
      user?.business_name,
    ]),
    registrationNumber: pickOptionalString([row?.dti_registration_number]),
    dtiCertificatePath: dtiPath,
    dtiDocumentStatus: dtiStatus,
    dtiDocumentId,
    ownerName: pickDisplayString([
      user?.name,
      row?.owner_name,
      row?.owner,
      user?.email,
      "Pending owner",
    ]),
    ownerEmail: pickOptionalString([user?.email, row?.owner_email]),
    ownerPhone: pickOptionalString([user?.phone, user?.mobile, row?.owner_phone, row?.contact_number]),
    createdAtRaw: createdSource,
    createdAtDisplay: formatDateTime(createdSource),
    documentsCount: documents.length,
    status: pickOptionalString([row?.status]),
  };
}

function matchesQuery(row: PendingMerchantRow, term: string) {
  const haystacks = [row.storeName, row.ownerName, row.ownerEmail ?? "", row.ownerPhone ?? ""];
  return haystacks.some((value) => value.toLowerCase().includes(term));
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => String(tag ?? "").trim())
    .filter((tag) => tag.length > 0);
}

function parseTagsInput(input: string): string[] {
  const tags = input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(tags));
}

function parseOptionalIdInput(input: string): number | null | "invalid" {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const value = Number(trimmed);
  if (!Number.isInteger(value) || value <= 0) return "invalid";

  return value;
}

function formatPlaceOptionLabel(place: any): string {
  const name = String(place?.name ?? "").trim();
  const landmark = String(place?.landmark ?? "").trim();
  const city = String(place?.city ?? "").trim();

  const left = [name, landmark].filter((part) => part.length > 0).join(" - ");
  if (left && city) return `${left} (${city})`;
  if (left) return left;
  if (city) return city;

  return `Place #${String(place?.id ?? "")}`.trim();
}

function formatServiceZoneOptionLabel(zone: any): string {
  const name = String(zone?.name ?? "").trim();
  const municipality = String(zone?.municipality ?? "").trim();
  const province = String(zone?.province ?? "").trim();

  const location = [municipality, province].filter((part) => part.length > 0).join(", ");
  if (name && location) return `${name} (${location})`;
  if (name) return name;
  if (location) return location;

  return `Zone #${String(zone?.id ?? "")}`.trim();
}

function isStatusError(err: unknown, status: number) {
  if (!err || typeof err !== "object") return false;
  const maybe = err as { status?: number };
  return typeof maybe.status === "number" && maybe.status === status;
}

export function AdminMerchantsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "suspended">("all");

  const list = useQuery({
    queryKey: ["admin", "merchants", "pending", q, statusFilter],
    queryFn: async () =>
      adminMerchantsPending(String(token), {
        per_page: 50,
        page: 1,
        q: q.trim() || undefined,
        status: statusFilter,
      }),
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  const paginator = (list.data as any)?.data;
  const rawRows: any[] = Array.isArray(paginator?.data) ? paginator.data : [];

  const normalizedRows = useMemo(() => rawRows.map((row) => toDisplayRow(row)), [rawRows]);

  const filteredRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return normalizedRows;
    return normalizedRows.filter((row) => matchesQuery(row, term));
  }, [normalizedRows, q]);

  const approveM = useMutation({
    mutationFn: async (id: number) => adminApproveMerchant(String(token), id),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin", "merchants", "pending"] }),
  });

  const rejectM = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      adminRejectMerchant(String(token), id, reason),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin", "merchants", "pending"] }),
  });

  const busy = approveM.isPending || rejectM.isPending;
  const totalPending = paginator?.total ?? normalizedRows.length;
  const isEmpty = !list.isLoading && filteredRows.length === 0;
  const emptyTitle = q.trim() ? "No merchants match that search" : "No merchants found";
  const emptyDescription = q.trim()
    ? "Try searching by store name, owner email, or contact number."
    : "Try a different status filter.";
  const unauthorized = list.isError && isStatusError(list.error, 403);
  const showError = !unauthorized && (list.isError || approveM.isError || rejectM.isError);
  const errorMessage =
    (list.error as any)?.message ?? (approveM.error as any)?.message ?? (rejectM.error as any)?.message ?? "Request failed";

  const skeletonRows = Array.from({ length: 4 }).map((_, idx) => (
    <tr key={`loading-${idx}`} className="border-t border-border">
      {Array.from({ length: 5 }).map((__, cellIdx) => (
        <td key={cellIdx} className="px-3 py-4">
          <div className="h-4 w-full max-w-[140px] rounded bg-muted/40 animate-pulse" />
        </td>
      ))}
    </tr>
  ));

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action: string;
    merchantId: number | null;
    row: PendingMerchantRow | null;
    reason?: string;
  }>({
    isOpen: false,
    action: "",
    merchantId: null,
    row: null,
  });

  const initialDocModal: DocModalState = {
    isOpen: false,
    action: "",
    documentId: null,
    merchant: null,
    reason: "",
  };

  const [docModal, setDocModal] = useState<DocModalState>(initialDocModal);
  const [tagsModal, setTagsModal] = useState<{
    isOpen: boolean;
    merchant: PendingMerchantRow | null;
    selectedStoreId: number | null;
    tagsInput: string;
    pickupPlaceIdInput: string;
    serviceZoneIdInput: string;
    pickupPlaceSearchInput: string;
    serviceZoneSearchInput: string;
  }>({
    isOpen: false,
    merchant: null,
    selectedStoreId: null,
    tagsInput: "",
    pickupPlaceIdInput: "",
    serviceZoneIdInput: "",
    pickupPlaceSearchInput: "",
    serviceZoneSearchInput: "",
  });

  const initialPreviewState = {
    isOpen: false,
    row: null as PendingMerchantRow | null,
    objectUrl: null as string | null,
    error: null as string | null,
    loading: false,
  };

  const [previewState, setPreviewState] = useState(initialPreviewState);
  const previewObjectUrlRef = useRef<string | null>(null);

  const toast = useToast();
  const activeRow = modalState.row;
  const modalDtiApproved = isDtiApproved(activeRow?.dtiDocumentStatus);
  const docModalMerchant = docModal.merchant;
  const docModalApproved = isDtiApproved(docModalMerchant?.dtiDocumentStatus);

  const handleApprove = (row: PendingMerchantRow) => {
    setModalState({ isOpen: true, action: "approve", merchantId: row.accountId, row, reason: undefined });
  };

  const handleReject = (row: PendingMerchantRow) => {
    setModalState({ isOpen: true, action: "reject", merchantId: row.accountId, row, reason: undefined });
  };

  const confirmAction = () => {
    const { action, merchantId, reason } = modalState;
    if (!merchantId) return;
    if (action === "approve") {
      if (!modalDtiApproved) {
        toast.warn("Cannot approve merchant. DTI certificate must be approved first.");
        return;
      }
      approveM.mutate(merchantId, {
        onSuccess: () => {
          toast.ok("Merchant approved successfully!");
          setModalState({ isOpen: false, action: "", merchantId: null, row: null, reason: undefined });
        },
      });
    } else if (action === "reject") {
      rejectM.mutate(
        { id: merchantId, reason: reason || "" },
        {
          onSuccess: () => {
            toast.ok("Merchant rejected successfully!");
            setModalState({ isOpen: false, action: "", merchantId: null, row: null, reason: undefined });
          },
        }
      );
    }
  };

  const docApproveM = useMutation({
    mutationFn: async (documentId: number) => adminApproveMerchantDocument(String(token), documentId),
  });

  const docRejectM = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: number; reason: string }) =>
      adminRejectMerchantDocument(String(token), documentId, reason),
  });

  const docBusy = docApproveM.isPending || docRejectM.isPending;
  const docError = docModal.action === "approve" ? docApproveM.error : docRejectM.error;
  const docErrorMessage = docError ? getErrorMessage(docError, "Document action failed") : null;
  const docRejectReasonInvalid = docModal.action === "reject" && docModal.reason.trim().length < 3;

  const merchantStoresQ = useQuery({
    queryKey: ["admin", "merchant", "stores", tagsModal.merchant?.accountId],
    queryFn: async () => adminMerchantShow(String(token), Number(tagsModal.merchant?.accountId)),
    enabled: !!token && tagsModal.isOpen && !!tagsModal.merchant?.accountId,
    refetchOnWindowFocus: false,
  });

  const placesForTagsQ = useQuery({
    queryKey: ["admin", "places", "for-store-assignment"],
    queryFn: async () => adminListPlaces(String(token)),
    enabled: !!token && tagsModal.isOpen,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const storesForTags = useMemo(() => {
    const stores = (merchantStoresQ.data as any)?.data?.stores;
    return Array.isArray(stores) ? stores : [];
  }, [merchantStoresQ.data]);

  const serviceZonesForTags = useMemo(() => {
    const zones = (merchantStoresQ.data as any)?.data?.service_zones;
    return Array.isArray(zones) ? zones : [];
  }, [merchantStoresQ.data]);

  const placesForTags = useMemo(() => {
    if (!Array.isArray(placesForTagsQ.data)) return [];
    return [...placesForTagsQ.data].sort((a: any, b: any) =>
      String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" })
    );
  }, [placesForTagsQ.data]);

  const selectedStoreForTags = useMemo(
    () => storesForTags.find((store: any) => Number(store?.id) === Number(tagsModal.selectedStoreId)) ?? null,
    [storesForTags, tagsModal.selectedStoreId]
  );

  const selectedPickupPlaceForTags = useMemo(() => {
    const selectedId = Number(tagsModal.pickupPlaceIdInput);
    if (!Number.isFinite(selectedId) || selectedId <= 0) return null;

    return placesForTags.find((place: any) => Number(place?.id) === selectedId) ?? null;
  }, [placesForTags, tagsModal.pickupPlaceIdInput]);

  const selectedServiceZoneForTags = useMemo(() => {
    const selectedId = Number(tagsModal.serviceZoneIdInput);
    if (!Number.isFinite(selectedId) || selectedId <= 0) return null;

    return serviceZonesForTags.find((zone: any) => Number(zone?.id) === selectedId) ?? null;
  }, [serviceZonesForTags, tagsModal.serviceZoneIdInput]);

  const filteredPlacesForTags = useMemo(() => {
    const term = tagsModal.pickupPlaceSearchInput.trim().toLowerCase();
    if (!term) return placesForTags;

    return placesForTags.filter((place: any) => {
      const haystack = [
        String(place?.name ?? ""),
        String(place?.landmark ?? ""),
        String(place?.city ?? ""),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [placesForTags, tagsModal.pickupPlaceSearchInput]);

  const filteredServiceZonesForTags = useMemo(() => {
    const term = tagsModal.serviceZoneSearchInput.trim().toLowerCase();
    if (!term) return serviceZonesForTags;

    return serviceZonesForTags.filter((zone: any) => {
      const haystack = [
        String(zone?.name ?? ""),
        String(zone?.slug ?? ""),
        String(zone?.municipality ?? ""),
        String(zone?.province ?? ""),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [serviceZonesForTags, tagsModal.serviceZoneSearchInput]);

  const selectedPickupPlaceVisible = useMemo(() => {
    const selectedId = Number(tagsModal.pickupPlaceIdInput);
    if (!Number.isFinite(selectedId) || selectedId <= 0) return true;

    return filteredPlacesForTags.some((place: any) => Number(place?.id) === selectedId);
  }, [filteredPlacesForTags, tagsModal.pickupPlaceIdInput]);

  const selectedServiceZoneVisible = useMemo(() => {
    const selectedId = Number(tagsModal.serviceZoneIdInput);
    if (!Number.isFinite(selectedId) || selectedId <= 0) return true;

    return filteredServiceZonesForTags.some((zone: any) => Number(zone?.id) === selectedId);
  }, [filteredServiceZonesForTags, tagsModal.serviceZoneIdInput]);

  useEffect(() => {
    if (!tagsModal.isOpen) return;
    if (!storesForTags.length) return;

    const selectedExists = storesForTags.some((store: any) => Number(store?.id) === Number(tagsModal.selectedStoreId));
    const nextStore = selectedExists ? selectedStoreForTags : storesForTags[0];
    if (!nextStore) return;

    const nextStoreId = Number(nextStore?.id);
    const nextTagsInput = normalizeTags(nextStore?.meta?.tags).join(", ");
    const nextPickupPlaceIdInput =
      nextStore?.pickup_place_id !== null && nextStore?.pickup_place_id !== undefined
        ? String(Number(nextStore.pickup_place_id))
        : "";
    const nextServiceZoneIdInput =
      nextStore?.service_zone_id !== null && nextStore?.service_zone_id !== undefined
        ? String(Number(nextStore.service_zone_id))
        : "";
    const nextPickupPlaceSearchInput = nextStore?.pickup_place_id
      ? formatPlaceOptionLabel(placesForTags.find((place: any) => Number(place?.id) === Number(nextStore.pickup_place_id)))
      : "";
    const nextServiceZoneSearchInput = nextStore?.service_zone_id
      ? formatServiceZoneOptionLabel(serviceZonesForTags.find((zone: any) => Number(zone?.id) === Number(nextStore.service_zone_id)))
      : "";

    setTagsModal((prev) => {
      const shouldUpdateStore = Number(prev.selectedStoreId) !== nextStoreId;
      const shouldUpdateTags = prev.tagsInput !== nextTagsInput && (!selectedExists || shouldUpdateStore);
      const shouldUpdatePickupPlace =
        prev.pickupPlaceIdInput !== nextPickupPlaceIdInput && (!selectedExists || shouldUpdateStore);
      const shouldUpdateServiceZone =
        prev.serviceZoneIdInput !== nextServiceZoneIdInput && (!selectedExists || shouldUpdateStore);
      const shouldUpdatePickupSearch =
        prev.pickupPlaceSearchInput !== nextPickupPlaceSearchInput && (!selectedExists || shouldUpdateStore);
      const shouldUpdateServiceZoneSearch =
        prev.serviceZoneSearchInput !== nextServiceZoneSearchInput && (!selectedExists || shouldUpdateStore);

      if (
        !shouldUpdateStore &&
        !shouldUpdateTags &&
        !shouldUpdatePickupPlace &&
        !shouldUpdateServiceZone &&
        !shouldUpdatePickupSearch &&
        !shouldUpdateServiceZoneSearch
      ) {
        return prev;
      }

      return {
        ...prev,
        selectedStoreId: nextStoreId,
        tagsInput: shouldUpdateTags ? nextTagsInput : prev.tagsInput,
        pickupPlaceIdInput: shouldUpdatePickupPlace ? nextPickupPlaceIdInput : prev.pickupPlaceIdInput,
        serviceZoneIdInput: shouldUpdateServiceZone ? nextServiceZoneIdInput : prev.serviceZoneIdInput,
        pickupPlaceSearchInput: shouldUpdatePickupSearch ? nextPickupPlaceSearchInput : prev.pickupPlaceSearchInput,
        serviceZoneSearchInput: shouldUpdateServiceZoneSearch ? nextServiceZoneSearchInput : prev.serviceZoneSearchInput,
      };
    });
  }, [storesForTags, placesForTags, serviceZonesForTags, tagsModal.isOpen, tagsModal.selectedStoreId, selectedStoreForTags]);

  const updateStoreTagsM = useMutation({
    mutationFn: async ({ storeId, tags }: { storeId: number; tags: string[] }) =>
      adminUpdateStoreMetaTags(String(token), storeId, tags),
    onSuccess: async () => {
      toast.ok("Store tags updated.");
      await qc.invalidateQueries({ queryKey: ["admin", "merchant", "stores", tagsModal.merchant?.accountId] });
      await qc.invalidateQueries({ queryKey: ["admin", "merchants", "pending"] });
    },
    onError: (err) => {
      toast.err(getErrorMessage(err, "Failed to update store tags"));
    },
  });

  const updateStoreAssignmentM = useMutation({
    mutationFn: async (payload: { storeId: number; pickup_place_id: number | null; service_zone_id: number | null }) =>
      adminUpdateStoreAssignment(String(token), payload.storeId, {
        pickup_place_id: payload.pickup_place_id,
        service_zone_id: payload.service_zone_id,
      }),
    onSuccess: async () => {
      toast.ok("Store pickup place and service zone updated.");
      await qc.invalidateQueries({ queryKey: ["admin", "merchant", "stores", tagsModal.merchant?.accountId] });
      await qc.invalidateQueries({ queryKey: ["admin", "merchants", "pending"] });
    },
    onError: (err) => {
      toast.err(getErrorMessage(err, "Failed to update store assignment"));
    },
  });

  const openTagsModal = (row: PendingMerchantRow) => {
    setTagsModal({
      isOpen: true,
      merchant: row,
      selectedStoreId: null,
      tagsInput: "",
      pickupPlaceIdInput: "",
      serviceZoneIdInput: "",
      pickupPlaceSearchInput: "",
      serviceZoneSearchInput: "",
    });
  };

  const closeTagsModal = () => {
    if (updateStoreTagsM.isPending || updateStoreAssignmentM.isPending) return;
    setTagsModal({
      isOpen: false,
      merchant: null,
      selectedStoreId: null,
      tagsInput: "",
      pickupPlaceIdInput: "",
      serviceZoneIdInput: "",
      pickupPlaceSearchInput: "",
      serviceZoneSearchInput: "",
    });
  };

  const onSelectStoreForTags = (storeId: number) => {
    const store = storesForTags.find((item: any) => Number(item?.id) === Number(storeId));
    const nextTags = normalizeTags(store?.meta?.tags).join(", ");
    const nextPickupPlaceIdInput =
      store?.pickup_place_id !== null && store?.pickup_place_id !== undefined
        ? String(Number(store.pickup_place_id))
        : "";
    const nextServiceZoneIdInput =
      store?.service_zone_id !== null && store?.service_zone_id !== undefined
        ? String(Number(store.service_zone_id))
        : "";
    const nextPickupPlaceSearchInput = store?.pickup_place_id
      ? formatPlaceOptionLabel(placesForTags.find((place: any) => Number(place?.id) === Number(store.pickup_place_id)))
      : "";
    const nextServiceZoneSearchInput = store?.service_zone_id
      ? formatServiceZoneOptionLabel(serviceZonesForTags.find((zone: any) => Number(zone?.id) === Number(store.service_zone_id)))
      : "";

    setTagsModal((prev) => ({
      ...prev,
      selectedStoreId: storeId,
      tagsInput: nextTags,
      pickupPlaceIdInput: nextPickupPlaceIdInput,
      serviceZoneIdInput: nextServiceZoneIdInput,
      pickupPlaceSearchInput: nextPickupPlaceSearchInput,
      serviceZoneSearchInput: nextServiceZoneSearchInput,
    }));
  };

  const submitTagsUpdate = () => {
    const storeId = Number(tagsModal.selectedStoreId);
    if (!Number.isFinite(storeId) || storeId <= 0) {
      toast.warn("Select a store first.");
      return;
    }

    const tags = parseTagsInput(tagsModal.tagsInput);
    if (tags.length === 0) {
      toast.warn("Enter at least one tag.");
      return;
    }

    const storeName = String(selectedStoreForTags?.name ?? `Store #${storeId}`);
    const confirmed = window.confirm(`Update search tags for ${storeName}?`);
    if (!confirmed) return;

    updateStoreTagsM.mutate({ storeId, tags });
  };

  const submitStoreAssignmentUpdate = () => {
    const storeId = Number(tagsModal.selectedStoreId);
    if (!Number.isFinite(storeId) || storeId <= 0) {
      toast.warn("Select a store first.");
      return;
    }

    const pickupPlaceId = parseOptionalIdInput(tagsModal.pickupPlaceIdInput);
    if (pickupPlaceId === "invalid") {
      toast.warn("Invalid pickup place selection.");
      return;
    }

    const serviceZoneId = parseOptionalIdInput(tagsModal.serviceZoneIdInput);
    if (serviceZoneId === "invalid") {
      toast.warn("Invalid service zone selection.");
      return;
    }

    const storeName = String(selectedStoreForTags?.name ?? `Store #${storeId}`);
    const confirmed = window.confirm(`Update pickup place and service zone for ${storeName}?`);
    if (!confirmed) return;

    updateStoreAssignmentM.mutate({
      storeId,
      pickup_place_id: pickupPlaceId,
      service_zone_id: serviceZoneId,
    });
  };

  const openDocModal = (action: "approve" | "reject", row: PendingMerchantRow) => {
    if (!row.dtiDocumentId) {
      toast.warn("No DTI document attached for this merchant.");
      return;
    }
    setDocModal({ isOpen: true, action, documentId: row.dtiDocumentId, merchant: row, reason: "" });
  };

  const closeDocModal = () => {
    setDocModal(initialDocModal);
  };

  const openPreview = (row: PendingMerchantRow) => {
    if (!row.dtiCertificatePath) {
      toast.warn("DTI certificate file unavailable.");
      return;
    }
    setPreviewState({ isOpen: true, row, objectUrl: null, error: null, loading: true });
  };

  const closePreview = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewState(initialPreviewState);
  };

  const handleDocConfirm = () => {
    if (!docModal.documentId) return;
    if (docModal.action === "approve") {
      docApproveM.mutate(docModal.documentId, {
        onSuccess: () => {
          toast.ok("DTI certificate approved");
          closeDocModal();
          qc.invalidateQueries({ queryKey: ["admin", "merchants", "pending"] });
        },
        onError: (err) => toast.apiErr(err, "Unable to approve DTI certificate"),
      });
    } else if (docModal.action === "reject") {
      if (docRejectReasonInvalid) return;
      docRejectM.mutate(
        { documentId: docModal.documentId, reason: docModal.reason.trim() },
        {
          onSuccess: () => {
            toast.ok("DTI certificate rejected");
            closeDocModal();
            qc.invalidateQueries({ queryKey: ["admin", "merchants", "pending"] });
          },
          onError: (err) => toast.apiErr(err, "Unable to reject DTI certificate"),
        }
      );
    }
  };

  useEffect(() => {
    if (!previewState.isOpen) return;
    const path = previewState.row?.dtiCertificatePath ?? null;
    if (!path) {
      setPreviewState((prev) => ({ ...prev, loading: false, error: "DTI certificate URL missing." }));
      return;
    }
    const resolvedUrl = resolveDocumentUrl(path);
    if (!resolvedUrl) {
      setPreviewState((prev) => ({ ...prev, loading: false, error: "Unable to resolve document URL." }));
      return;
    }

    const controller = new AbortController();
    setPreviewState((prev) => ({ ...prev, loading: true, error: null, objectUrl: null }));

    (async () => {
      try {
        const res = await fetch(resolvedUrl, {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const blob = await res.blob();
        if (controller.signal.aborted) return;
        const objectUrl = URL.createObjectURL(blob);
        if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = objectUrl;
        setPreviewState((prev) => ({ ...prev, loading: false, objectUrl }));
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = getErrorMessage(err, "Unable to load document");
        setPreviewState((prev) => ({ ...prev, loading: false, error: message }));
      }
    })();

    return () => {
      controller.abort();
    };
  }, [previewState.isOpen, previewState.row?.dtiCertificatePath, token]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  return (
    <div className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Merchants</div>
          <div className="text-sm text-muted-foreground">
            Review merchant applications and maintain store search tags.
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/admin">Back</Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => list.refetch()}
            disabled={list.isFetching}
          >
            {list.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval queue</CardTitle>
        </CardHeader>
        <CardContent>
          {unauthorized ? (
            <EmptyState
              title="You don't have access to merchant approvals"
              description="Ask a system administrator to grant this permission, then reload the page."
              icon={ShieldOff}
              actions={
                <Button asChild variant="secondary" size="sm">
                  <Link to="/admin">Back to admin home</Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Input
                  className="min-w-[220px] max-w-sm"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search store, owner, or contact"
                />
                <select
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "all" | "pending" | "approved" | "rejected" | "suspended")
                  }
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
                <Button variant="secondary" onClick={() => setQ("")} disabled={!q.trim()}>
                  Clear
                </Button>
              </div>
              <Separator className="my-3" />

              <div className="overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Store</th>
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.isLoading
                      ? skeletonRows
                      : filteredRows.map((row) => {
                          const dtiApproved = isDtiApproved(row.dtiDocumentStatus);
                          const dtiStatusLabel = formatStatusLabel(row.dtiDocumentStatus);
                          const merchantStatus = normalizeStatus(row.status);
                          const canModerateMerchant = merchantStatus === "pending" || merchantStatus === "";
                          const approvalBlockedReason = dtiApproved
                            ? null
                            : row.dtiCertificatePath
                            ? "DTI certificate review pending"
                            : "DTI certificate missing";

                          return (
                            <tr key={row.merchantId} className="border-t border-border hover:bg-muted/20">
                              <td className="px-3 py-2 align-top font-medium">#{row.merchantId}</td>
                              <td className="px-3 py-2 align-top">
                                <div className="font-medium leading-tight">{row.storeName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {row.registrationNumber ? `DTI ${row.registrationNumber}` : "DTI number not provided"}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <Badge variant="outline" className="text-[11px]">
                                    Docs {row.documentsCount}
                                  </Badge>
                                  {row.status ? (
                                    <Badge variant="secondary" className="text-[11px] capitalize">
                                      {row.status}
                                    </Badge>
                                  ) : null}
                                  {row.dtiDocumentStatus ? (
                                    <Badge
                                      variant={
                                        dtiApproved ? "success" : row.dtiDocumentStatus === "rejected" ? "danger" : "warning"
                                      }
                                      className="text-[11px] capitalize"
                                    >
                                      {`DTI ${dtiStatusLabel}`}
                                    </Badge>
                                  ) : null}
                                </div>
                                {row.dtiCertificatePath ? (
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => openPreview(row)}
                                    >
                                      Preview DTI certificate
                                    </Button>
                                    <span className={dtiApproved ? "text-muted-foreground" : "text-destructive"}>
                                      {dtiApproved
                                        ? "DTI certificate approved"
                                        : "DTI certificate awaiting audit"}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    DTI certificate file not uploaded
                                  </div>
                                )}
                                {row.dtiDocumentId ? (
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs sm:text-sm">
                                    {!dtiApproved ? (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          disabled={docBusy}
                                          onClick={() => openDocModal("approve", row)}
                                        >
                                          Approve DTI
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          disabled={docBusy}
                                          onClick={() => openDocModal("reject", row)}
                                        >
                                          Reject DTI
                                        </Button>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">Document already approved.</span>
                                    )}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="font-medium leading-tight">{row.ownerName}</div>
                                {row.ownerEmail ? (
                                  <div className="text-xs text-muted-foreground">{row.ownerEmail}</div>
                                ) : null}
                                {row.ownerPhone ? (
                                  <div className="text-xs text-muted-foreground">{row.ownerPhone}</div>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="font-medium leading-tight">{row.createdAtDisplay}</div>
                                {row.createdAtRaw ? (
                                  <div className="text-xs text-muted-foreground">{row.createdAtRaw}</div>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="flex flex-wrap gap-2">
                                  {canModerateMerchant ? (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleApprove(row)}
                                        disabled={busy || !dtiApproved}
                                        title={approvalBlockedReason ?? undefined}
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleReject(row)}
                                        disabled={busy}
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  ) : (
                                    <Badge variant="secondary" className="capitalize">
                                      {merchantStatus || "approved"}
                                    </Badge>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openTagsModal(row)}
                                  >
                                    Tags
                                  </Button>
                                </div>
                                {canModerateMerchant && !dtiApproved ? (
                                  <div className="mt-2 text-[11px] text-destructive">{approvalBlockedReason}</div>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                    {isEmpty ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6">
                          <EmptyState
                            title={emptyTitle}
                            description={emptyDescription}
                            icon={UserRound}
                            actions={
                              <>
                                {q.trim() ? (
                                  <Button size="sm" variant="secondary" onClick={() => setQ("")}>
                                    Clear search
                                  </Button>
                                ) : null}
                                <Button size="sm" onClick={() => list.refetch()} disabled={list.isFetching}>
                                  {list.isFetching ? "Refreshing…" : "Refresh"}
                                </Button>
                              </>
                            }
                          />
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {!list.isLoading && !isEmpty ? (
                <div className="px-1 pt-3 text-xs text-muted-foreground">
                  Showing {filteredRows.length} of {totalPending} merchant{totalPending === 1 ? "" : "s"}.
                </div>
              ) : null}

              {showError ? (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  {errorMessage}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, action: "", merchantId: null, row: null, reason: undefined })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalState.action === "approve" ? "Approve Merchant" : "Reject Merchant"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {activeRow ? (
              <div className="rounded-xl border border-border bg-muted/10 p-3 text-sm">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Merchant</div>
                <div className="mt-1 font-medium">{activeRow.storeName}</div>
                <div className="text-xs text-muted-foreground">Owner: {activeRow.ownerName}</div>
                <div className="mt-3 rounded-lg border border-border bg-background/70 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">DTI certificate</div>
                    <Badge
                      variant={modalDtiApproved ? "success" : "warning"}
                      className="capitalize"
                    >
                      {`DTI ${formatStatusLabel(activeRow.dtiDocumentStatus)}`}
                    </Badge>
                  </div>
                  {activeRow.registrationNumber ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Registration #{activeRow.registrationNumber}
                    </div>
                  ) : null}
                  {activeRow.dtiCertificatePath ? (
                    <div className="mt-3">
                      <Button size="sm" variant="outline" onClick={() => openPreview(activeRow)}>
                        Preview certificate
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-muted-foreground">Certificate file not uploaded.</div>
                  )}
                  {!modalDtiApproved ? (
                    <div className="mt-3 text-xs text-destructive">
                      You must approve the DTI certificate before approving this merchant.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {modalState.action === "reject" ? (
              <textarea
                placeholder="Enter rejection reason"
                className="w-full rounded border border-border p-2"
                value={modalState.reason || ""}
                onChange={(e) => setModalState((prev) => ({ ...prev, reason: e.target.value }))}
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button
              onClick={() => confirmAction()}
              disabled={busy}
            >
              Confirm
            </Button>
            <Button
              variant="secondary"
              onClick={() => setModalState({ isOpen: false, action: "", merchantId: null, row: null, reason: undefined })}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog isOpen={docModal.isOpen} onClose={closeDocModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {docModal.action === "approve" ? "Approve DTI certificate" : "Reject DTI certificate"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {docModalMerchant ? (
              <div className="rounded-xl border border-border bg-muted/10 p-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Merchant</div>
                <div className="mt-1 font-medium">{docModalMerchant.storeName}</div>
                <div className="text-xs text-muted-foreground">Owner: {docModalMerchant.ownerName}</div>
                <div className="mt-3 rounded-lg border border-border bg-background/80 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">DTI certificate</div>
                    <Badge variant={docModalApproved ? "success" : "warning"} className="capitalize">
                      {`DTI ${formatStatusLabel(docModalMerchant.dtiDocumentStatus)}`}
                    </Badge>
                  </div>
                  {docModalMerchant.registrationNumber ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Registration #{docModalMerchant.registrationNumber}
                    </div>
                  ) : null}
                  <div className="mt-3">
                    {docModalMerchant.dtiCertificatePath ? (
                      <Button size="sm" variant="outline" onClick={() => openPreview(docModalMerchant)}>
                        Preview certificate
                      </Button>
                    ) : (
                      <div className="text-xs text-muted-foreground">Certificate file unavailable.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {docModal.action === "reject" ? (
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Reason (required)</div>
                <textarea
                  className="w-full rounded border border-border p-2"
                  placeholder="Explain why the DTI certificate is rejected"
                  value={docModal.reason}
                  onChange={(e) => setDocModal((prev) => ({ ...prev, reason: e.target.value }))}
                  disabled={docBusy}
                  rows={3}
                />
                {docRejectReasonInvalid ? (
                  <div className="mt-1 text-xs text-destructive">Reason must be at least 3 characters.</div>
                ) : null}
              </div>
            ) : null}

            {docErrorMessage ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {docErrorMessage}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={handleDocConfirm} disabled={docBusy || (docModal.action === "reject" && docRejectReasonInvalid)}>
              Confirm
            </Button>
            <Button variant="secondary" onClick={closeDocModal} disabled={docBusy}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog isOpen={previewState.isOpen} onClose={closePreview}>
        <DialogContent>
          <div className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>DTI certificate preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {previewState.row ? (
              <div className="rounded-xl border border-border bg-muted/10 p-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Merchant</div>
                <div className="mt-1 font-medium">{previewState.row.storeName}</div>
                <div className="text-xs text-muted-foreground">Owner: {previewState.row.ownerName}</div>
                {previewState.row.registrationNumber ? (
                  <div className="text-xs text-muted-foreground">Registration #{previewState.row.registrationNumber}</div>
                ) : null}
              </div>
            ) : null}

            {previewState.loading ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-border">
                <span className="text-xs text-muted-foreground">Loading document…</span>
              </div>
            ) : previewState.error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {previewState.error}
              </div>
            ) : previewState.objectUrl ? (
              <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-black">
                <img
                  src={previewState.objectUrl}
                  alt="DTI certificate"
                  className="h-full w-full object-contain"
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={closePreview}>Close</Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog isOpen={tagsModal.isOpen} onClose={closeTagsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Store tags and assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {tagsModal.merchant ? (
              <div className="rounded-xl border border-border bg-muted/10 p-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Merchant</div>
                <div className="mt-1 font-medium">{tagsModal.merchant.storeName}</div>
                <div className="text-xs text-muted-foreground">Owner: {tagsModal.merchant.ownerName}</div>
              </div>
            ) : null}

            {merchantStoresQ.isLoading ? (
              <div className="text-muted-foreground">Loading stores...</div>
            ) : merchantStoresQ.isError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {getErrorMessage(merchantStoresQ.error, "Failed to load merchant stores")}
              </div>
            ) : storesForTags.length === 0 ? (
              <div className="text-muted-foreground">No store found for this merchant.</div>
            ) : (
              <>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Store</div>
                  <select
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    value={tagsModal.selectedStoreId ?? ""}
                    onChange={(e) => onSelectStoreForTags(Number(e.target.value))}
                    disabled={updateStoreTagsM.isPending || updateStoreAssignmentM.isPending}
                  >
                    {storesForTags.map((store: any) => (
                      <option key={store.id} value={store.id}>
                        {store.name ?? `Store #${store.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Pickup place</div>
                    {placesForTagsQ.isLoading ? (
                      <div className="flex h-10 items-center rounded-md border border-border bg-muted/20 px-3 text-sm text-muted-foreground">
                        Loading places...
                      </div>
                    ) : placesForTagsQ.isError ? (
                      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                        {getErrorMessage(placesForTagsQ.error, "Failed to load places")}
                      </div>
                    ) : (
                      <>
                        <Input
                          value={tagsModal.pickupPlaceSearchInput}
                          onChange={(e) => setTagsModal((prev) => ({ ...prev, pickupPlaceSearchInput: e.target.value }))}
                          placeholder="Search pickup place by name..."
                          disabled={updateStoreTagsM.isPending || updateStoreAssignmentM.isPending}
                        />
                        <select
                          className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                          value={tagsModal.pickupPlaceIdInput}
                          onChange={(e) => setTagsModal((prev) => ({ ...prev, pickupPlaceIdInput: e.target.value }))}
                          disabled={updateStoreTagsM.isPending || updateStoreAssignmentM.isPending}
                        >
                          <option value="">No pickup place</option>
                          {!selectedPickupPlaceVisible && selectedPickupPlaceForTags ? (
                            <option value={selectedPickupPlaceForTags.id}>
                              {formatPlaceOptionLabel(selectedPickupPlaceForTags)}
                            </option>
                          ) : null}
                          {filteredPlacesForTags.map((place: any) => (
                            <option key={place.id} value={place.id}>
                              {formatPlaceOptionLabel(place)}
                            </option>
                          ))}
                          {filteredPlacesForTags.length === 0 && tagsModal.pickupPlaceSearchInput.trim() ? (
                            <option value="" disabled>
                              No places match search
                            </option>
                          ) : null}
                        </select>
                      </>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      Type to search, then select pickup place.
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Service zone</div>
                    <>
                      <Input
                        value={tagsModal.serviceZoneSearchInput}
                        onChange={(e) => setTagsModal((prev) => ({ ...prev, serviceZoneSearchInput: e.target.value }))}
                        placeholder="Search service zone..."
                        disabled={updateStoreTagsM.isPending || updateStoreAssignmentM.isPending}
                      />
                      <select
                        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                        value={tagsModal.serviceZoneIdInput}
                        onChange={(e) => setTagsModal((prev) => ({ ...prev, serviceZoneIdInput: e.target.value }))}
                        disabled={updateStoreTagsM.isPending || updateStoreAssignmentM.isPending}
                      >
                        <option value="">No service zone</option>
                        {!selectedServiceZoneVisible && selectedServiceZoneForTags ? (
                          <option value={selectedServiceZoneForTags.id}>
                            {formatServiceZoneOptionLabel(selectedServiceZoneForTags)}
                          </option>
                        ) : null}
                        {filteredServiceZonesForTags.map((zone: any) => (
                          <option key={zone.id} value={zone.id}>
                            {formatServiceZoneOptionLabel(zone)}
                          </option>
                        ))}
                        {serviceZonesForTags.length === 0 ? (
                          <option value="" disabled>
                            No service zones available
                          </option>
                        ) : filteredServiceZonesForTags.length === 0 && tagsModal.serviceZoneSearchInput.trim() ? (
                          <option value="" disabled>
                            No service zones match search
                          </option>
                        ) : null}
                      </select>
                    </>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Type to search, then select service zone.
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Search tags</div>
                  <Input
                    value={tagsModal.tagsInput}
                    onChange={(e) => setTagsModal((prev) => ({ ...prev, tagsInput: e.target.value }))}
                    placeholder="food, chicken, juice, drinks, fast food, lechon"
                    disabled={updateStoreTagsM.isPending || updateStoreAssignmentM.isPending}
                  />
                  <div className="mt-1 text-xs text-muted-foreground">
                    Comma-separated tags used by customer search.
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={submitStoreAssignmentUpdate}
              disabled={
                updateStoreTagsM.isPending ||
                updateStoreAssignmentM.isPending ||
                merchantStoresQ.isLoading ||
                storesForTags.length === 0
              }
            >
              {updateStoreAssignmentM.isPending ? "Saving..." : "Save pickup and zone"}
            </Button>
            <Button
              onClick={submitTagsUpdate}
              disabled={
                updateStoreTagsM.isPending ||
                updateStoreAssignmentM.isPending ||
                merchantStoresQ.isLoading ||
                storesForTags.length === 0
              }
            >
              {updateStoreTagsM.isPending ? "Saving..." : "Save tags"}
            </Button>
            <Button variant="secondary" onClick={closeTagsModal} disabled={updateStoreTagsM.isPending || updateStoreAssignmentM.isPending}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
