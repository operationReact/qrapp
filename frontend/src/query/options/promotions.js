import { queryOptions } from "@tanstack/react-query";
import { fetchAllPromotions } from "../../services/promotion-service";

export const promotionsOptions = (activeLocationId = null) =>
  queryOptions({
    queryKey: ["promotions", activeLocationId],
    queryFn: () => fetchAllPromotions(activeLocationId),
    staleTime: 1000 * 60 * 2,
  });

