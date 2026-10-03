import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as api from "./api";
import { foodCourtKeys } from "./keys";

// The API returns plain arrays; tolerate wrapped payloads defensively.
const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    for (const key of ["content", "data", "items"]) {
      if (Array.isArray(payload[key])) return payload[key];
    }
  }
  return [];
};

const listQuery = (key, fn, enabled) => ({
  queryKey: key,
  queryFn: fn,
  enabled,
  select: toArray,
  staleTime: 30_000,
});

export const useFoodCourts = () =>
  useQuery(listQuery(foodCourtKeys.list(), api.getFoodCourts, true));

export const useDashboard = (id, month) =>
  useQuery({
    queryKey: foodCourtKeys.dashboard(id, month),
    queryFn: () => api.getDashboard(id, month),
    enabled: Boolean(id),
    staleTime: 30_000,
  });

export const useStalls = (id) => useQuery(listQuery(foodCourtKeys.stalls(id), () => api.getStalls(id), Boolean(id)));
export const useTenants = (id) => useQuery(listQuery(foodCourtKeys.tenants(id), () => api.getTenants(id), Boolean(id)));
export const useLeases = (id) => useQuery(listQuery(foodCourtKeys.leases(id), () => api.getLeases(id), Boolean(id)));
export const useRents = (id, month) =>
  useQuery(listQuery(foodCourtKeys.rents(id, month), () => api.getRents(id, month), Boolean(id)));
export const useDeposits = (id) =>
  useQuery(listQuery(foodCourtKeys.deposits(id), () => api.getDeposits(id), Boolean(id)));
export const useExpenses = (id, month) =>
  useQuery(listQuery(foodCourtKeys.expenses(id, month), () => api.getExpenses(id, month), Boolean(id)));
export const useActionItems = (id) =>
  useQuery(listQuery(foodCourtKeys.actionItems(id), () => api.getActionItems(id), Boolean(id)));
export const useLandlords = (id) =>
  useQuery(listQuery(foodCourtKeys.landlords(id), () => api.getLandlords(id), Boolean(id)));
export const usePropertyLeases = (id) =>
  useQuery(listQuery(foodCourtKeys.propertyLeases(id), () => api.getPropertyLeases(id), Boolean(id)));
export const useLandlordRent = (id, month) =>
  useQuery(listQuery(foodCourtKeys.landlordRent(id, month), () => api.getLandlordRent(id, month), Boolean(id)));
export const useRentPayments = (id, invoiceId) =>
  useQuery(
    listQuery(foodCourtKeys.payments(id, invoiceId), () => api.getRentPayments(id, invoiceId), Boolean(id && invoiceId)),
  );
export const useRentAdjustments = (id, invoiceId) =>
  useQuery(
    listQuery(foodCourtKeys.adjustments(id, invoiceId), () => api.getRentAdjustments(id, invoiceId), Boolean(id && invoiceId)),
  );

export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  const data = error?.response?.data;
  const raw = data?.message || data?.error || data?.detail;
  if (typeof raw === "string" && raw) return raw.replace(/_/g, " ");
  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors)[0];
    if (typeof first === "string") return first;
  }
  return fallback;
}

// Any write can change counts, rent and balances on several screens, so every
// mutation refreshes the whole Food Court cache instead of hand-picking keys.
export function useFcMutation(mutationFn, { success, failure } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: foodCourtKeys.all });
      if (success) toast.success(success);
    },
    onError: (error) => toast.error(errorMessage(error, failure)),
  });
}
