import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, ShieldCheck } from "lucide-react";
import {
  AgreementCard,
  FinanceEmpty,
  FinanceError,
  FinanceHeading,
  FinanceLoading,
  FinanceTabs,
  TaxNotice,
} from "@/components/partner/PartnerFinanceComponents";
import { partnerFinanceAgreementsOptions } from "@/query/options/partner-finance";

export const Route = createFileRoute("/partner/finance/agreements")({ component: AgreementsPage });

function AgreementsPage() {
  const query = useQuery(partnerFinanceAgreementsOptions());
  const agreements = query.data || [];
  const current = agreements.find((agreement) => agreement.currentlyEffective);
  const others = agreements.filter((agreement) => agreement !== current);
  return (
    <section className="partner-fin-page">
      <FinanceHeading
        eyebrow="Finance"
        title="Commission agreements"
        description="The commercial terms used to calculate your settlements. Agreements are read-only here."
      />
      <FinanceTabs />
      <p className="partner-fin-readonly"><ShieldCheck className="size-4" />Agreements are managed by Bro & Bro. Contact your account manager to request a change.</p>
      {query.isLoading ? <FinanceLoading />
        : query.isError ? <FinanceError message="Agreements are temporarily unavailable." onRetry={() => query.refetch()} />
          : agreements.length ? (
            <>
              {current && <section aria-label="Current agreement"><h2 className="partner-fin-h2">Current agreement</h2><AgreementCard agreement={current} /></section>}
              {others.length > 0 && (
                <section aria-label="Other agreements">
                  <h2 className="partner-fin-h2">{current ? "Other agreements" : "Agreements"}</h2>
                  <div className="partner-fin-agreement-grid">{others.map((agreement) => <AgreementCard key={agreement.id} agreement={agreement} />)}</div>
                </section>
              )}
            </>
          ) : <FinanceEmpty icon={FileText} title="No agreements yet" description="Your commission agreement will appear here once it has been set up." />}
      <TaxNotice treatment={current?.taxTreatment} />
    </section>
  );
}
