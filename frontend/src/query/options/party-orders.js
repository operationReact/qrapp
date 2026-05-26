import { queryOptions } from "@tanstack/react-query";
import { getPartyOrdersAdmin, getMyPartyOrders } from "../../services/party-order-service";

export const partyOrdersOptions = queryOptions({
  queryKey: ["party-orders"],
  queryFn: getPartyOrdersAdmin,
  staleTime: 1000 * 60,
});

export const myPartyOrdersOptions = queryOptions({
  queryKey: ["my-party-orders"],
  queryFn: getMyPartyOrders,
  staleTime: 1000 * 30,
});
