import { queryOptions } from "@tanstack/react-query";
import { getMyHallPhotosForOrder } from "@/services/hall-of-happiness-service";

export const myHallOrderPhotosOptions = (orderId, enabled = true) =>
  queryOptions({
    queryKey: ["hall-of-happiness", "order", orderId],
    queryFn: () => getMyHallPhotosForOrder(orderId),
    enabled: Boolean(orderId && enabled),
    staleTime: 1000 * 30,
  });
