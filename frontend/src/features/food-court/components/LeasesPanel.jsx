import { FileText } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "../format";
import { PanelError, PanelEmpty, PanelLoading, StatusPill } from "./FeatureStates";

function leaseTone(lease) {
  const status = String(lease?.status || "").toUpperCase();
  if (status === "ACTIVE" || !status) return "success";
  if (status === "EXPIRING" || status === "PENDING") return "warning";
  return "muted";
}

function leaseTypeLabel(lease) {
  const type = String(lease?.type ?? lease?.leaseType ?? "").toUpperCase();
  if (type === "LANDLORD") return "Landlord";
  if (type === "TENANT") return "Tenant";
  return type ? type.replace(/_/g, " ") : "—";
}

export function LeasesPanel({ query }) {
  if (query.isLoading) return <PanelLoading rows={4} />;
  if (query.isError) return <PanelError onRetry={query.refetch} />;

  const leases = query.data || [];
  if (!leases.length) {
    return (
      <PanelEmpty
        icon={FileText}
        title="No leases recorded"
        description="Landlord and tenant lease agreements will be shown here."
      />
    );
  }

  return (
    <Card className="overflow-hidden rounded-[16px] border-[var(--cc-border)] bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-[var(--cc-page)]">
            <TableHead>Party</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Monthly</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leases.map((lease) => (
            <TableRow key={lease.id}>
              <TableCell className="font-medium">
                {lease.partyName || lease.tenantName || lease.landlordName || `Lease ${lease.id}`}
              </TableCell>
              <TableCell>{leaseTypeLabel(lease)}</TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(lease.monthlyAmount ?? lease.monthlyRent ?? lease.amount)}
              </TableCell>
              <TableCell>{formatDate(lease.startDate)}</TableCell>
              <TableCell>{formatDate(lease.endDate)}</TableCell>
              <TableCell>
                <StatusPill tone={leaseTone(lease)}>{lease.status || "Active"}</StatusPill>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
