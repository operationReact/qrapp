import { createFileRoute } from "@tanstack/react-router";
import CompanyInfoPage from "@/components/shared/CompanyInfoPage";
import { buildPageHead, companyInfoPages } from "@/content/companyInfo";

export const Route = createFileRoute("/contact-us")({
  head: () =>
    buildPageHead({
      title: companyInfoPages.contactUs.title,
      description: companyInfoPages.contactUs.description,
      path: "/contact-us",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Contact Us", path: "/contact-us" },
      ],
    }),
  component: ContactUsPage,
});

function ContactUsPage() {
  return <CompanyInfoPage page={companyInfoPages.contactUs} />;
}
