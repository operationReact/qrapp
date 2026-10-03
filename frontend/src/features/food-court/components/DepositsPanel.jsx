import { PiggyBank } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "../format";
import { PanelError, PanelEmpty, PanelLoading, StatusPill } from "./FeatureStates";

function depositTone(deposit) {
  const status = String(deposit?.status || "").toUpperCase();
  if (status === "REFUNDED") return "muted";
  if (status === "FORFEITED") return "danger";
  return "info";
}

const depositAmount = (deposit) => Number(deposit?.amount ?? deposit?.depositAmount ?? 0) || 0;

export function DepositsPanel({ query }) {
  if (query.isLoading) return <PanelLoading rows={4} />;
  if (query.isError) return <PanelError onRetry={query.refetch} />;

  const deposits = query.data || [];
  if (!deposits.length) {
    return (
      <PanelEmpty
        icon={PiggyBank}
        title="No deposits recorded"
        description="Security deposits collected from tenants will appear here."
      />
    );
  }

  const total = deposits.reduce((sum, deposit) => sum + depositAmount(deposit), 0);

  return (
    <Card className="overflow-hidden rounded-[16px] border-[var(--cc-border)] bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-[var(--cc-page)]">
            <TableHead>Tenant</TableHead>
            <TableHead>Stall</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deposits.map((deposit) => (
            <TableRow key={deposit.id}>
              <TableCell className="font-medium">
                {deposit.tenantName || deposit.tenant?.name || `Tenant ${deposit.tenantId ?? ""}`}
              </TableCell>
              <TableCell>{deposit.stallCode || deposit.stallName || "—"}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(depositAmount(deposit))}</TableCell>
              <TableCell>{formatDate(deposit.receivedOn || deposit.createdAt)}</TableCell>
              <TableCell>
                <StatusPill tone={depositTone(deposit)}>{deposit.status || "Held"}</StatusPill>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="font-semibold">Total held</TableCell>
            <TableCell className="text-right font-bold">{formatCurrency(total)}</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableFooter>
      </Table>
    </Card>
  );
}
