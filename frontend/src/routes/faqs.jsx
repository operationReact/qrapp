import { createFileRoute } from "@tanstack/react-router";
import CompanyInfoPage from "@/components/shared/CompanyInfoPage";
import { buildPageHead, companyInfoPages } from "@/content/companyInfo";

export const Route = createFileRoute("/faqs")({
  head: () =>
    buildPageHead({
      title: companyInfoPages.faqs.title,
      description: companyInfoPages.faqs.description,
      path: "/faqs",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "FAQs", path: "/faqs" },
      ],
    }),
  component: FaqsPage,
});

function FaqsPage() {
  return <CompanyInfoPage page={companyInfoPages.faqs} />;
}
