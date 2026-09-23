import { apiClient } from "./index";

export const fetchInventoryAlerts = ({ limit = 6, locationId = null } = {}) =>
  apiClient
    .get("/admin/inventory/items", {
      params: {
        lowStockOnly: true,
        isHidden: false,
        page: 0,
        size: limit,
        sort: "availableQuantity,asc",
        ...(locationId != null ? { locationId } : {}),
      },
    })
    .then((response) => response.data);
