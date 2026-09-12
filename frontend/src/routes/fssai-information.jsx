import { createFileRoute } from "@tanstack/react-router";
import CompanyInfoPage from "@/components/shared/CompanyInfoPage";
import { buildPageHead, companyInfoPages } from "@/content/companyInfo";

export const Route = createFileRoute("/fssai-information")({
  head: () =>
    buildPageHead({
      title: companyInfoPages.fssai.title,
      description: companyInfoPages.fssai.description,
      path: "/fssai-information",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "FSSAI Information", path: "/fssai-information" },
      ],
    }),
  component: FssaiInformationPage,
});

function FssaiInformationPage() {
  return <CompanyInfoPage page={companyInfoPages.fssai} />;
}
