import PropTypes from "prop-types";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PromotionCard } from "@/components/PromotionCard";
import { validatePromotion } from "@/services/promotion-service";
import { TagIcon } from "@phosphor-icons/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Empty } from "./ui/empty";
import { Separator } from "./ui/separator";
import { Field, FieldContent, FieldLabel } from "./ui/field";
import { ButtonGroup } from "./ui/button-group";

/**
 * Full-featured promotion drawer for the cart page.
 *
 * Props:
 *   cartPayload       – { restaurantId, subtotal, deliveryFee, items }
 *   eligiblePromotions
 *   ineligiblePromotions
 *   appliedPromotion  – currently applied promotion object or null
 *   onApply(promo)    – called with promo to apply (null = remove)
 *   isLoading
 */
export function PromotionDrawer({
  cartPayload,
  eligiblePromotions = [],
  ineligiblePromotions = [],
  appliedPromotion,
  onApply,
  isLoading,
}) {
  const navigate = useNavigate();
  const [showIneligible, setShowIneligible] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);

  const totalEligible = eligiblePromotions.length;

  const handleManualApply = async () => {
    if (!manualCode.trim()) return;
    setManualError(null);
    setManualLoading(true);
    try {
      const result = await validatePromotion({
        promotionCode: manualCode.trim().toUpperCase(),
        ...cartPayload,
      });
      onApply({
        id: result.promotionId,
        code: result.code,
        title: result.title,
        rewardDisplay: result.rewardDisplay,
        actualDiscount: result.actualDiscount,
        isAutoApplied: false,
      });
      setManualCode("");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Invalid or ineligible code";
      setManualError(msg);
    } finally {
      setManualLoading(false);
    }
  };

  const trigger = appliedPromotion ? (
    // Already applied — show compact badge
    <button className="w-full flex items-center justify-between gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-left">
      <div className="flex items-center gap-2">
        <TagIcon
          weight="duotone"
          size={18}
          className="text-green-700 shrink-0"
        />
        <div>
          <p className="text-sm font-semibold text-green-800">
            {appliedPromotion.code ?? "Offer"} applied
          </p>
          <p className="text-xs text-green-700">
            🎉 You save ₹{Number(appliedPromotion.actualDiscount).toFixed(2)}!
          </p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">Change</span>
    </button>
  ) : (
    // Not applied
    <button className="w-full flex items-center justify-between gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-left hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2">
        <TagIcon
          weight="duotone"
          size={18}
          className="text-muted-foreground shrink-0"
        />
        <div>
          <p className="text-sm font-medium">
            {isLoading
              ? "Loading offers…"
              : totalEligible > 0
                ? `${totalEligible} offer${totalEligible > 1 ? "s" : ""} available`
                : "Add a promo code"}
          </p>
          {totalEligible > 0 && !isLoading && (
            <p className="text-xs text-muted-foreground">
              Tap to view and apply
            </p>
          )}
        </div>
      </div>
      <ChevronDown size={16} className="text-muted-foreground shrink-0" />
    </button>
  );

  return (
    <Dialog className="px-4">
      <DialogTrigger className="w-full" render={trigger} />

      <DialogContent className="max-w-sm mx-auto max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Available Offers
            {totalEligible > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({totalEligible})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pb-4 space-y-3">
          {/* Eligible promotions */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Checking available offers…
            </p>
          ) : eligiblePromotions.length === 0 ? (
            <Empty className="text-sm border text-muted-foreground py-4 text-center">
              No offers available for this cart.
            </Empty>
          ) : (
            eligiblePromotions.map((promo) => (
              <PromotionCard
                key={promo.id}
                promotion={promo}
                mode="eligible"
                isApplied={appliedPromotion?.id === promo.id}
                onApply={(p) => {
                  if (p === null) {
                    onApply(null);
                  } else {
                    onApply({ ...p, isAutoApplied: false });
                  }
                }}
              />
            ))
          )}

          {/* Ineligible promotions (collapsed) */}
          {ineligiblePromotions.length > 0 && (
            <div className="space-y-2">
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full py-1"
                onClick={() => setShowIneligible((v) => !v)}
              >
                <ChevronDown
                  size={14}
                  className={cn(
                    "transition-transform",
                    showIneligible && "rotate-180",
                  )}
                />
                Not applicable ({ineligiblePromotions.length})
              </button>

              {showIneligible &&
                ineligiblePromotions.map((promo) => (
                  <PromotionCard
                    key={promo.id}
                    promotion={promo}
                    mode="ineligible"
                    onNavigateToMenu={() => navigate({ to: "/" })}
                  />
                ))}
            </div>
          )}

          <div className="flex gap-2 items-center">
            <Separator className="data-horizontal:flex-1" />
            <span className="text-muted-foreground tracking-widest font-medium text-xs">
              OR
            </span>
            <Separator className="data-horizontal:flex-1" />
          </div>

          {/* Manual code entry */}
          <Field className="px-1">
            <FieldLabel htmlFor="manual-code">Enter a code</FieldLabel>
            <FieldContent>
              <ButtonGroup className="w-full">
                <Input
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(e.target.value.toUpperCase());
                    setManualError(null);
                  }}
                  placeholder="e.g. SAVE120"
                  className="h-9 text-sm uppercase"
                  onKeyDown={(e) => e.key === "Enter" && handleManualApply()}
                />
                <Button
                  variant="branded-secondary"
                  size="sm"
                  className="h-9 shrink-0"
                  disabled={!manualCode.trim() || manualLoading}
                  onClick={handleManualApply}
                >
                  {manualLoading ? "…" : "Apply"}
                </Button>
              </ButtonGroup>
            </FieldContent>
            {manualError && (
              <p className="text-xs text-red-600">{manualError}</p>
            )}
          </Field>
        </div>

        <DialogFooter>
          <DialogClose
            className={buttonVariants({
              variant: "secondary",
            })}
          >
            Done
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

PromotionDrawer.propTypes = {
  cartPayload: PropTypes.object.isRequired,
  eligiblePromotions: PropTypes.array,
  ineligiblePromotions: PropTypes.array,
  appliedPromotion: PropTypes.object,
  onApply: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};
