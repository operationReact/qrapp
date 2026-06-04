import { apiClient } from "./index";

export const loginUser = (credentials) =>
  apiClient.post("/auth/login", credentials).then((r) => r.data);

export const getCurrentUser = () =>
  apiClient.get("/auth/me").then((r) => r.data);

export const getMilestoneCoupons = () =>
  apiClient.get("/auth/me/milestones").then((r) => r.data);

export const updateCurrentUser = (data) =>
  apiClient.put("/auth/me", data).then((r) => r.data);

export const registerUser = (data) =>
  apiClient.post("/auth/register", data).then((r) => r.data);

export const generateOTP = ({ userName, phone }) =>
  apiClient.post("/whatsapp/send", { userName, phone }).then((r) => r.data);

export const verifyOTP = ({ phone, otp }) =>
  apiClient.post("/whatsapp/verify-otp", { phone, otp }).then((r) => r.data);

export const forgotPassword = async ({ phone, otp }) => {
  // Mocked for now. Will be replaced with a real backend call.
  if (!phone || !otp) {
    throw new Error("phone and otp are required");
  }
  await new Promise((r) => setTimeout(r, 300));
  return { success: true, message: "Password reset successfully" };
};
