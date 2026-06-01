import { queryOptions } from "@tanstack/react-query";
import {
  getCategoryById,
  getCategoryMenuItems,
} from "@/services/category-service";

export const categoryOptions = (categoryId) =>
  queryOptions({
    queryKey: ["category", categoryId],
    queryFn: () => getCategoryById(categoryId),
    enabled: Boolean(categoryId),
  });

export const categoryMenuOptions = (categoryId) =>
  queryOptions({
    queryKey: ["category-menu", categoryId],
    queryFn: () => getCategoryMenuItems(categoryId),
    enabled: Boolean(categoryId),
    placeholderData: [],
  });
