import { queryOptions } from "@tanstack/react-query";
import { getPartyOrdersAdmin } from "../../services/party-order-service";

export const partyOrdersOptions = queryOptions({
  queryKey: ["party-orders"],
  queryFn: getPartyOrdersAdmin,
  staleTime: 1000 * 60,
});
