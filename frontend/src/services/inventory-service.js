import { apiClient } from "./index";

export const fetchInventoryAlerts = ({ limit = 6 } = {}) =>
  apiClient
    .get("/admin/inventory/items", {
      params: { lowStockOnly: true, isHidden: false, page: 0, size: limit, sort: "availableQuantity,asc" },
    })
    .then((response) => response.data);
