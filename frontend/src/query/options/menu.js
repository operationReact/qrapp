import { queryOptions } from "@tanstack/react-query";
import {
  getMenu,
  getCategories,
  getRecommendedMenu,
} from "../../services/menu-service";

export const menuOptions = (opts = {}) =>
  queryOptions({
    queryKey: ["menu", opts],
    queryFn: () => getMenu(opts),
    staleTime: 1000 * 60 * 2,
    placeholderData: [],
  });

export const categoriesOptions = queryOptions({
  queryKey: ["categories"],
  queryFn: getCategories,
  staleTime: 1000 * 60 * 5,
});

export const recommendedMenuOptions = (limit = 6) =>
  queryOptions({
    queryKey: ["menu", "recommended", limit],
    queryFn: () => getRecommendedMenu({ limit }),
    staleTime: 1000 * 60 * 2,
  });
