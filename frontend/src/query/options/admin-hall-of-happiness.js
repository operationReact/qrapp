import { queryOptions } from "@tanstack/react-query";
import { getAdminHallOfHappiness } from "@/services/hall-of-happiness-service";

export const adminHallOfHappinessOptions = (params = {}) =>
  queryOptions({
    queryKey: ["admin", "hall-of-happiness", params],
    queryFn: () => getAdminHallOfHappiness(params),
    staleTime: 1000 * 30,
  });
