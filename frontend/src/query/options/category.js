import { queryOptions } from "@tanstack/react-query";
import {
  getCategoryById,
  getCategoryMenuItems,
} from "@/services/category-service";

export const categoryOptions = (categoryId, locationId) =>
  queryOptions({
    queryKey: ["category", locationId, categoryId],
    queryFn: () => getCategoryById(categoryId, locationId),
    enabled: Boolean(categoryId && locationId),
  });

export const categoryMenuOptions = (categoryId, locationId) =>
  queryOptions({
    queryKey: ["category-menu", locationId, categoryId],
    queryFn: () => getCategoryMenuItems(categoryId, locationId),
    enabled: Boolean(categoryId && locationId),
    placeholderData: [],
  });
