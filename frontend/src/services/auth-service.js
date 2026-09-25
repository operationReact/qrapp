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

export const requestRegistrationOTP = ({
  phone, password, name, dateOfBirth, specialDate, specialDayType, specialDayCustomLabel,
  defaultLocationId, customerCompanyId, termsAccepted,
}) =>
  apiClient.post("/auth/register/request-otp", {
    phoneNumber: phone,
    password,
    name,
    ...(dateOfBirth ? { dateOfBirth } : {}),
    ...(specialDate ? { specialDate } : {}),
    ...(specialDayType ? { specialDayType } : {}),
    ...(specialDayType === "Other" && specialDayCustomLabel?.trim()
      ? { specialDayCustomLabel: specialDayCustomLabel.trim() }
      : {}),
    ...(defaultLocationId != null ? { defaultLocationId } : {}),
    customerCompanyId,
    termsAccepted,
  }).then((r) => r.data);

export const verifyRegistrationOTP = ({ phone, otp }) =>
  apiClient.post("/auth/register/verify-otp", { phoneNumber: phone, otp }).then((r) => r.data);

export const requestPasswordResetOTP = (phone) =>
  apiClient.post("/auth/password/forgot/request-otp", { phoneNumber: phone }).then((r) => r.data);

export const verifyPasswordResetOTP = ({ phone, otp }) =>
  apiClient.post("/auth/password/forgot/verify-otp", { phoneNumber: phone, otp }).then((r) => r.data);

export const resetPassword = ({ phone, resetAuthorization, newPassword }) =>
  apiClient.post("/auth/password/reset", { phoneNumber: phone, resetAuthorization, newPassword })
    .then((r) => r.data);
