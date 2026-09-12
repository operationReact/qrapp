import { createFileRoute } from "@tanstack/react-router";
import CompanyInfoPage from "@/components/shared/CompanyInfoPage";
import { buildPageHead, companyInfoPages } from "@/content/companyInfo";

export const Route = createFileRoute("/about-us")({
  head: () =>
    buildPageHead({
      title: companyInfoPages.aboutUs.title,
      description: companyInfoPages.aboutUs.description,
      path: "/about-us",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "About Us", path: "/about-us" },
      ],
    }),
  component: AboutUsPage,
});

function AboutUsPage() {
  return <CompanyInfoPage page={companyInfoPages.aboutUs} />;
}
