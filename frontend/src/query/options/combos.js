import { queryOptions } from "@tanstack/react-query";
import {
  getComboAnalyticsSummary,
  listCombos,
  getCombo,
  listSignatureProducts,
} from "../../services/comboService";

export const comboSummaryOptions = queryOptions({
  queryKey: ["combos", "summary"],
  queryFn: getComboAnalyticsSummary,
  staleTime: 1000 * 60 * 2,
});

export const comboListOptions = (params = {}) =>
  queryOptions({
    queryKey: ["combos", "list", params],
    queryFn: () => listCombos(params),
    staleTime: 1000 * 60,
  });

export const comboOptions = (id) =>
  queryOptions({
    queryKey: ["combos", id],
    queryFn: () => getCombo(id),
    enabled: !!id,
    staleTime: 1000 * 60,
  });

export const signatureProductListOptions = (params = {}) =>
  queryOptions({
    queryKey: ["signature-products", "list", params],
    queryFn: () => listSignatureProducts(params),
    staleTime: 1000 * 60 * 2,
  });
