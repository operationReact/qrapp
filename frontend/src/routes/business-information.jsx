import { createFileRoute } from "@tanstack/react-router";
import CompanyInfoPage from "@/components/shared/CompanyInfoPage";
import { buildPageHead, companyInfoPages } from "@/content/companyInfo";

export const Route = createFileRoute("/business-information")({
  head: () =>
    buildPageHead({
      title: companyInfoPages.businessInfo.title,
      description: companyInfoPages.businessInfo.description,
      path: "/business-information",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Business Information", path: "/business-information" },
      ],
    }),
  component: BusinessInformationPage,
});

function BusinessInformationPage() {
  return <CompanyInfoPage page={companyInfoPages.businessInfo} />;
}
