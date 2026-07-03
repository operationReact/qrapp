import { queryOptions } from "@tanstack/react-query";
import { fetchAllPromotions } from "../../services/promotion-service";

export const promotionsOptions = queryOptions({
  queryKey: ["promotions"],
  queryFn: fetchAllPromotions,
  staleTime: 1000 * 60 * 2,
});

