import { createFileRoute } from "@tanstack/react-router";
import CompanyInfoPage from "@/components/shared/CompanyInfoPage";
import { buildPageHead, companyInfoPages } from "@/content/companyInfo";

export const Route = createFileRoute("/grievance-redressal")({
  head: () =>
    buildPageHead({
      title: companyInfoPages.grievance.title,
      description: companyInfoPages.grievance.description,
      path: "/grievance-redressal",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Grievance Redressal", path: "/grievance-redressal" },
      ],
    }),
  component: GrievanceRedressalPage,
});

function GrievanceRedressalPage() {
  return <CompanyInfoPage page={companyInfoPages.grievance} />;
}
