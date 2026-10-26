import { createFileRoute } from "@tanstack/react-router";
import CompanyInfoPage from "@/components/shared/CompanyInfoPage";
import { buildPageHead, companyInfoPages } from "@/content/companyInfo";

export const Route = createFileRoute("/account-deletion")({
  head: () =>
    buildPageHead({
      title: companyInfoPages.accountDeletion.title,
      description: companyInfoPages.accountDeletion.description,
      path: "/account-deletion",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Delete Account", path: "/account-deletion" },
      ],
    }),
  component: AccountDeletionPage,
});

function AccountDeletionPage() {
  return <CompanyInfoPage page={companyInfoPages.accountDeletion} />;
}
