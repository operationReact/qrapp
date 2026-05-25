import { queryOptions } from "@tanstack/react-query";
import {
  walletGetBalance,
  walletGetOverview,
  walletGetTransactions,
} from "../../services/wallet-service";

export const walletBalanceOptions = queryOptions({
  queryKey: ["wallet", "balance"],
  queryFn: walletGetBalance,
  staleTime: 1000 * 60,
});

export const walletOverviewOptions = queryOptions({
  queryKey: ["wallet", "overview"],
  queryFn: walletGetOverview,
  staleTime: 1000 * 60,
});

export const walletTransactionsOptions = ({ page = 0, size = 20 } = {}) =>
  queryOptions({
    queryKey: ["wallet", "transactions", { page, size }],
    queryFn: () => walletGetTransactions({ page, size }),
    staleTime: 1000 * 30,
  });
