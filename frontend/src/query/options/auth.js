import { queryOptions } from "@tanstack/react-query";
import { getCurrentUser } from "../../services/auth-service";

export const currentUserOptions = queryOptions({
  queryKey: ["auth", "me"],
  queryFn: getCurrentUser,
  staleTime: 1000 * 60 * 5,
});
