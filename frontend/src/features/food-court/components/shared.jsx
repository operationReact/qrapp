import { Phone } from "lucide-react";

import { cn } from "@/lib/utils";

import { useFc } from "../context";
import {
  RENT_TONES,
  formatCurrency,
  formatMonthLabel,
  invoiceStatus,
  rentStatusLabel,
  tenantDisplayName,
} from "../format";
import { StatusPill } from "./kit";

export const invoiceMonth = (invoice) =>
  formatMonthLabel(`${invoice.periodYear}-${String(invoice.periodMonth).padStart(2, "0")}`);

export function RentPill({ invoice, fallback = "Not billed" }) {
  if (!invoice) return <StatusPill tone="muted">{fallback}</StatusPill>;
  return <StatusPill tone={RENT_TONES[invoiceStatus(invoice)] || "muted"}>{rentStatusLabel(invoice)}</StatusPill>;
}

// Compact list of invoices; each row opens the rent detail sheet.
export function InvoiceRows({ invoices, emptyText = "No rent records yet." }) {
  const { open } = useFc();
  if (!invoices.length) return <p className="py-3 text-sm text-[var(--cc-muted-text)]">{emptyText}</p>;
  return (
    <ul className="divide-y divide-[var(--cc-divider)]">
      {invoices.map((invoice) => (
        <li key={invoice.id}>
          <button
            type="button"
            onClick={() => open("rent-detail", { invoiceId: invoice.id })}
            className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 py-2 text-left text-sm hover:bg-[var(--cc-page)]"
          >
            <span className="min-w-0 truncate font-medium">{invoiceMonth(invoice)}</span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="tabular-nums">{formatCurrency(invoice.netAmount ?? invoice.rentAmount)}</span>
              <RentPill invoice={invoice} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function LinkButton({ onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer text-right font-semibold text-[var(--cc-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function PhoneLink({ phone }) {
  if (!phone) return "—";
  return (
    <a href={`tel:${phone}`} className="inline-flex items-center gap-1 font-semibold text-[var(--cc-primary)]">
      <Phone className="size-3.5" aria-hidden="true" />
      {phone}
    </a>
  );
}

export const tenantLabel = (tenant) => tenantDisplayName(tenant);
