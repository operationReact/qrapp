import { createFileRoute } from "@tanstack/react-router";
import CompanyInfoPage from "@/components/shared/CompanyInfoPage";
import { buildPageHead, companyInfoPages } from "@/content/companyInfo";

export const Route = createFileRoute("/refund-cancellation-policy")({
  head: () =>
    buildPageHead({
      title: companyInfoPages.refundCancellation.title,
      description: companyInfoPages.refundCancellation.description,
      path: "/refund-cancellation-policy",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Refund & Cancellation Policy", path: "/refund-cancellation-policy" },
      ],
    }),
  component: RefundCancellationPolicyPage,
});

function RefundCancellationPolicyPage() {
  return <CompanyInfoPage page={companyInfoPages.refundCancellation} />;
}
