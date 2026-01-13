import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  fetchAdminOrders,
  fetchAdminOrderTimeline,
  forceCancelAdminOrder,
  reassignAdminOrder,
  unassignAdminOrder,
} from "./api";
import { adminOrderKeys } from "./keys";
import type {
  AdminOrderFilters,
  AdminOrdersResponse,
  AdminReassignDriverPayload,
  AdminUnassignDriverPayload,
  OrderTimelineResponse,
} from "./types";

function ensureToken(token?: string | null) {
  if (!token) {
    throw new Error("Not authenticated");
  }
  return token;
}

function parseFilters(filters: AdminOrderFilters): AdminOrderFilters {
  return {
    ...filters,
    page: filters.page && filters.page > 0 ? filters.page : 1,
    per_page: filters.per_page && filters.per_page > 0 ? filters.per_page : 20,
  };
}

export function useAdminOrders(filters: AdminOrderFilters, enabled = true) {
  const { token } = useAuth();
  const parsed = React.useMemo(() => parseFilters(filters), [filters]);
  const canQuery = !!token && enabled;

  return useQuery<AdminOrdersResponse, Error>({
    queryKey: adminOrderKeys.list(parsed),
    queryFn: async () => fetchAdminOrders(ensureToken(token), parsed),
    enabled: canQuery,
    staleTime: 15_000,
    placeholderData: (previousData) => previousData,
  });
}

export function useAdminOrderTimeline(orderId: number | string | null | undefined, enabled = true) {
  const { token } = useAuth();
  const canQuery = !!token && enabled && orderId !== null && orderId !== undefined;

  return useQuery<OrderTimelineResponse, Error>({
    queryKey: adminOrderKeys.timeline(orderId ?? "missing"),
    queryFn: async () => fetchAdminOrderTimeline(ensureToken(token), orderId as number | string),
    enabled: canQuery,
    staleTime: 15_000,
  });
}

export function useForceCancelOrder(orderId: number | string | null | undefined) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const canMutate = !!token && orderId !== null && orderId !== undefined;

  return useMutation({
    mutationFn: async (reason: string) => {
      if (!canMutate) throw new Error("Not ready to force-cancel");
      return forceCancelAdminOrder(ensureToken(token), orderId as number | string, reason);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: adminOrderKeys.timeline(orderId ?? "missing") });
      await qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
  });
}

export function useReassignDriver(orderId: number | string | null | undefined) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const canMutate = !!token && orderId !== null && orderId !== undefined;

  return useMutation({
    mutationFn: async (payload: AdminReassignDriverPayload) => {
      if (!canMutate) throw new Error("Not ready to reassign driver");
      return reassignAdminOrder(ensureToken(token), orderId as number | string, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: adminOrderKeys.timeline(orderId ?? "missing") });
      await qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
  });
}

export function useUnassignDriver(orderId: number | string | null | undefined) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const canMutate = !!token && orderId !== null && orderId !== undefined;

  return useMutation({
    mutationFn: async (payload: AdminUnassignDriverPayload) => {
      if (!canMutate) throw new Error("Not ready to unassign driver");
      return unassignAdminOrder(ensureToken(token), orderId as number | string, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: adminOrderKeys.timeline(orderId ?? "missing") });
      await qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
  });
}
