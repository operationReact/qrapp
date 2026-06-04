import { apiClient } from "./index";

export const getMilestoneConfigs = () =>
  apiClient.get("/api/admin/milestones").then((r) => r.data);

export const createMilestoneConfig = (data) =>
  apiClient.post("/api/admin/milestones", data).then((r) => r.data);

export const updateMilestoneConfig = (id, data) =>
  apiClient.put(`/api/admin/milestones/${id}`, data).then((r) => r.data);

export const toggleMilestoneConfig = (id) =>
  apiClient.patch(`/api/admin/milestones/${id}/toggle`).then((r) => r.data);

export const deleteMilestoneConfig = (id) =>
  apiClient.delete(`/api/admin/milestones/${id}`).then((r) => r.data);

