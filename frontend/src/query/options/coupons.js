import { queryOptions } from "@tanstack/react-query";
import { fetchCoupons } from "../../services/coupon-service";

export const couponsOptions = queryOptions({
  queryKey: ["coupons"],
  queryFn: fetchCoupons,
  staleTime: 1000 * 60 * 2,
});
