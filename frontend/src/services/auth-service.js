import { apiClient } from "./index";

export const loginUser = (credentials) =>
  apiClient.post("/auth/login", credentials).then((r) => r.data);

export const getCurrentUser = () =>
  apiClient.get("/auth/me").then((r) => r.data);

export const updateCurrentUser = (data) =>
  apiClient.put("/auth/me", data).then((r) => r.data);

export const registerUser = (data) =>
  apiClient.post("/auth/register", data).then((r) => r.data);

export const generateOTP = ({ userName, phone }) =>
  apiClient.post("/whatsapp/send", { userName, phone }).then((r) => r.data);

export const verifyOTP = ({ phone, otp }) =>
  apiClient.post("/whatsapp/verify-otp", { phone, otp }).then((r) => r.data);
