import { queryOptions } from "@tanstack/react-query";
import { fetchInventoryAlerts } from "../../services/inventory-service";

export const inventoryAlertsOptions = (limit = 6) =>
  queryOptions({
    queryKey: ["inventory", "alerts", limit],
    queryFn: () => fetchInventoryAlerts({ limit }),
    staleTime: 1000 * 60,
  });
