import { createFileRoute } from "@tanstack/react-router";
import CompanyInfoPage from "@/components/shared/CompanyInfoPage";
import { buildPageHead, companyInfoPages } from "@/content/companyInfo";

export const Route = createFileRoute("/help-support")({
  head: () =>
    buildPageHead({
      title: companyInfoPages.helpSupport.title,
      description: companyInfoPages.helpSupport.description,
      path: "/help-support",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Help & Support", path: "/help-support" },
      ],
    }),
  component: HelpSupportPage,
});

function HelpSupportPage() {
  return <CompanyInfoPage page={companyInfoPages.helpSupport} />;
}
