import { apiClient } from "./index";

export const walletGetBalance = () =>
  apiClient.get("/api/wallet/balance").then((r) => r.data);

export const walletGetOverview = () =>
  apiClient.get("/api/wallet/overview").then((r) => r.data);

export const walletGetTransactions = ({ page = 0, size = 20 } = {}) => {
  const safePage = Number.isFinite(page) ? Math.max(0, Number(page)) : 0;
  const safeSize = Number.isFinite(size)
    ? Math.max(1, Math.min(50, Number(size)))
    : 20;
  return apiClient
    .get("/api/wallet/transactions", { params: { page: safePage, size: safeSize } })
    .then((r) => r.data);
};

export const walletCreateOrder = (data) =>
  apiClient.post("/api/wallet/create-order", data).then((r) => r.data);

export const walletVerifyPayment = (data) =>
  apiClient.post("/api/wallet/verify-payment", data).then((r) => r.data);

export const walletPay = (data) =>
  apiClient.post("/api/wallet/pay", data).then((r) => r.data);
