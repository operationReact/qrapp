import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInrIcon, CalendarIcon, UsersIcon } from "@phosphor-icons/react";
import PartyOrderEstimateDialog from "./PartyOrderEstimateDialog";

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PartyOrderCard({ order, onEstimateSubmitted }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const description = order.menuDescription || "";
  const isLong = description.length > 120;
  const displayDescription =
    isLong && !expanded ? description.slice(0, 120) + "..." : description;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">
              Party Order #{order.id || "N/A"}
            </CardTitle>
            {order.estimatedAmount ? (
              <Badge variant="default" className="bg-emerald-600">
                <CurrencyInrIcon weight="bold" className="mr-1 size-3.5" />
                {formatCurrency(order.estimatedAmount)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                Pending Estimate
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon weight="bold" className="size-4 text-primary" />
            <span>{formatDate(order.eventDateTime)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UsersIcon weight="bold" className="size-4 text-primary" />
            <span>{order.numberOfPeople} people</span>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Menu:</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {displayDescription}
            </p>
            {isLong && (
              <button
                className="mt-1 text-xs text-primary underline underline-offset-2"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>

          {!order.estimatedAmount && (
            <Button
              size="sm"
              className="w-full mt-2"
              onClick={() => setDialogOpen(true)}
            >
              Add Estimate
            </Button>
          )}
        </CardContent>
      </Card>

      <PartyOrderEstimateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        orderId={order.id}
        onSubmitted={() => {
          setDialogOpen(false);
          onEstimateSubmitted?.();
        }}
      />
    </>
  );
}
