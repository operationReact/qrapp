import { queryOptions } from "@tanstack/react-query";
import { getMilestoneConfigs } from "../../services/milestone-service";

export const milestoneConfigsOptions = queryOptions({
  queryKey: ["admin-milestone-configs"],
  queryFn: getMilestoneConfigs,
  staleTime: 1000 * 60 * 2,
});

