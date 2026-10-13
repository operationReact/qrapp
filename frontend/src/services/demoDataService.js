import { apiClient } from "./index";

export const startDemoDataSeed = () =>
  apiClient.post("/api/admin/demo-data/seed").then((response) => response.data);

export const cleanupDemoData = () =>
  apiClient.post("/api/admin/demo-data/cleanup").then((response) => response.data);

export const fetchDemoDataSeedStatus = () =>
  apiClient.get("/api/admin/demo-data/seed/status").then((response) => response.data);
