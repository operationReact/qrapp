import { createFileRoute } from "@tanstack/react-router";
import CompanyInfoPage from "@/components/shared/CompanyInfoPage";
import { buildPageHead, companyInfoPages } from "@/content/companyInfo";

export const Route = createFileRoute("/food-safety")({
  head: () =>
    buildPageHead({
      title: companyInfoPages.foodSafety.title,
      description: companyInfoPages.foodSafety.description,
      path: "/food-safety",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Food Safety", path: "/food-safety" },
      ],
    }),
  component: FoodSafetyPage,
});

function FoodSafetyPage() {
  return <CompanyInfoPage page={companyInfoPages.foodSafety} />;
}
