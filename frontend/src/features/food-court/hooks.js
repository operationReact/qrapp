import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as api from "./api";
import { foodCourtKeys } from "./keys";

// Normalises the many shapes an API might return (array, { data }, { content },
// { items }) into a plain array so panels can always map safely.
function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export function useFoodCourts() {
  return useQuery({
    queryKey: foodCourtKeys.list(),
    queryFn: api.getFoodCourts,
    select: toArray,
  });
}

export function useFoodCourtSummary(foodCourtId, month) {
  return useQuery({
    queryKey: foodCourtKeys.summary(foodCourtId, month),
    queryFn: () => api.getFoodCourtSummary(foodCourtId, month),
    enabled: Boolean(foodCourtId),
    retry: false,
  });
}

export function useStalls(foodCourtId) {
  return useQuery({
    queryKey: foodCourtKeys.stalls(foodCourtId),
    queryFn: () => api.getStalls(foodCourtId),
    enabled: Boolean(foodCourtId),
    select: toArray,
  });
}

export function useTenants(foodCourtId) {
  return useQuery({
    queryKey: foodCourtKeys.tenants(foodCourtId),
    queryFn: () => api.getTenants(foodCourtId),
    enabled: Boolean(foodCourtId),
    select: toArray,
  });
}

export function useLeases(foodCourtId) {
  return useQuery({
    queryKey: foodCourtKeys.leases(foodCourtId),
    queryFn: () => api.getLeases(foodCourtId),
    enabled: Boolean(foodCourtId),
    select: toArray,
  });
}

export function useRents(foodCourtId, month) {
  return useQuery({
    queryKey: foodCourtKeys.rents(foodCourtId, month),
    queryFn: () => api.getRents(foodCourtId, month),
    enabled: Boolean(foodCourtId),
    select: toArray,
  });
}

export function useDeposits(foodCourtId) {
  return useQuery({
    queryKey: foodCourtKeys.deposits(foodCourtId),
    queryFn: () => api.getDeposits(foodCourtId),
    enabled: Boolean(foodCourtId),
    select: toArray,
  });
}

export function useExpenses(foodCourtId, month) {
  return useQuery({
    queryKey: foodCourtKeys.expenses(foodCourtId, month),
    queryFn: () => api.getExpenses(foodCourtId, month),
    enabled: Boolean(foodCourtId),
    select: toArray,
  });
}

export function useActionItems(foodCourtId) {
  return useQuery({
    queryKey: foodCourtKeys.actionItems(foodCourtId),
    queryFn: () => api.getActionItems(foodCourtId),
    enabled: Boolean(foodCourtId),
    select: toArray,
  });
}

export function useRecordRentPayment(foodCourtId, month) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rentId, payload }) =>
      api.recordRentPayment(foodCourtId, rentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: foodCourtKeys.rents(foodCourtId, month) });
      queryClient.invalidateQueries({ queryKey: foodCourtKeys.summary(foodCourtId, month) });
      toast.success("Payment recorded");
    },
    onError: () => toast.error("Unable to record payment"),
  });
}

export function useCreateExpense(foodCourtId, month) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.createExpense(foodCourtId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: foodCourtKeys.expenses(foodCourtId, month) });
      queryClient.invalidateQueries({ queryKey: foodCourtKeys.summary(foodCourtId, month) });
      toast.success("Expense added");
    },
    onError: () => toast.error("Unable to add expense"),
  });
}

export function useCreateActionItem(foodCourtId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.createActionItem(foodCourtId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: foodCourtKeys.actionItems(foodCourtId) });
      toast.success("Action item created");
    },
    onError: () => toast.error("Unable to create action item"),
  });
}

export function useUpdateActionItemStatus(foodCourtId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ actionItemId, status }) =>
      api.updateActionItemStatus(foodCourtId, actionItemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: foodCourtKeys.actionItems(foodCourtId) });
    },
    onError: () => toast.error("Unable to update action item"),
  });
}
