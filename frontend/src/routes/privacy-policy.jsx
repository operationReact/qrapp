import { createFileRoute } from "@tanstack/react-router";
import CompanyInfoPage from "@/components/shared/CompanyInfoPage";
import { buildPageHead, companyInfoPages } from "@/content/companyInfo";

export const Route = createFileRoute("/privacy-policy")({
  head: () =>
    buildPageHead({
      title: companyInfoPages.privacy.title,
      description: companyInfoPages.privacy.description,
      path: "/privacy-policy",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Privacy Policy", path: "/privacy-policy" },
      ],
    }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return <CompanyInfoPage page={companyInfoPages.privacy} />;
}
