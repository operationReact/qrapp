import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Filter } from "lucide-react";
import {
  FinanceEmpty,
  FinanceError,
  FinanceFilterDropdown,
  FinanceHeading,
  FinancePagination,
  FinanceLoading,
  FinanceTabs,
  SettlementsList,
  TaxNotice,
} from "@/components/partner/PartnerFinanceComponents";
import { GenerateSettlementButton } from "@/components/partner/PartnerFinanceActions";
import { SETTLEMENT_STATUSES, statusMeta } from "@/lib/partnerFinance";
import { partnerSettlementsOptions } from "@/query/options/partner-finance";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [["", "All statuses"], ...SETTLEMENT_STATUSES.map((status) => [status, statusMeta(status).label])];

export const Route = createFileRoute("/partner/finance/settlements/")({
  validateSearch: (search) => {
    const page = Number.parseInt(search.page, 10);
    return {
      page: Number.isInteger(page) && page > 1 ? page : undefined,
      status: SETTLEMENT_STATUSES.includes(search.status) ? search.status : undefined,
    };
  },
  component: SettlementsPage,
});

function SettlementsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = (search.page || 1) - 1;
  const query = useQuery(partnerSettlementsOptions({ page, size: PAGE_SIZE, status: search.status }));
  const rows = query.data?.content || [];
  const setSearch = (next) => navigate({ search: (previous) => ({ ...previous, ...next }) });

  return (
    <section className="partner-fin-page">
      <FinanceHeading
        eyebrow="Finance"
        title="Settlements"
        description="Monthly settlements of sales, commission and payouts. Open a settlement for line items, adjustments and the statement."
        actions={<GenerateSettlementButton />}
      />
      <FinanceTabs />
      <div className="partner-fin-toolbar">
        <p className="partner-fin-muted" aria-live="polite">{query.data ? `${query.data.totalElements} ${query.data.totalElements === 1 ? "settlement" : "settlements"}${search.status ? ` · ${statusMeta(search.status).label}` : ""}` : "\u00A0"}</p>
        <FinanceFilterDropdown icon={Filter} label="Status" value={search.status || ""} options={STATUS_OPTIONS} onChange={(value) => setSearch({ status: value || undefined, page: undefined })} />
      </div>
      {query.isLoading ? <FinanceLoading />
        : query.isError ? <FinanceError message="Settlements are temporarily unavailable." onRetry={() => query.refetch()} />
          : rows.length ? (
            <>
              <SettlementsList rows={rows} />
              <FinancePagination page={page} data={query.data} noun="settlements" onPage={(next) => setSearch({ page: next > 0 ? next + 1 : undefined })} />
            </>
          ) : (
            <FinanceEmpty icon={FileText} title={search.status ? "No settlements with this status" : "No settlements yet"} description={search.status ? "Try a different status filter." : "Generated settlements will appear here."} />
          )}
      <TaxNotice note={rows[0]?.taxNote} />
    </section>
  );
}
