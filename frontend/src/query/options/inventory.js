import { queryOptions } from "@tanstack/react-query";
import { fetchInventoryAlerts } from "../../services/inventory-service";

export const inventoryAlertsOptions = (limit = 6, activeLocationId = null) =>
  queryOptions({
    queryKey: ["inventory", "alerts", limit, activeLocationId],
    queryFn: () => fetchInventoryAlerts({ limit, locationId: activeLocationId }),
    staleTime: 1000 * 60,
  });
