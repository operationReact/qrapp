import { createFileRoute } from "@tanstack/react-router";
import CompanyInfoPage from "@/components/shared/CompanyInfoPage";
import { buildPageHead, companyInfoPages } from "@/content/companyInfo";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () =>
    buildPageHead({
      title: companyInfoPages.terms.title,
      description: companyInfoPages.terms.description,
      path: "/terms-and-conditions",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Terms & Conditions", path: "/terms-and-conditions" },
      ],
    }),
  component: TermsAndConditionsPage,
});

function TermsAndConditionsPage() {
  return <CompanyInfoPage page={companyInfoPages.terms} />;
}
