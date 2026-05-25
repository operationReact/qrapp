import { apiClient } from "./index";

export const createPartyOrder = (data) =>
  apiClient.post("/party-order/create", data).then((r) => r.data);

export const getPartyOrdersAdmin = () =>
  apiClient.get("/admin/party-orders").then((r) => r.data);

export const submitPartyOrderEstimate = (orderId, data) =>
  apiClient.post(`/party-order/${orderId}/estimate`, data).then((r) => r.data);
