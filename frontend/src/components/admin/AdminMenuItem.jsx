import { useState } from "react";
import PropTypes from "prop-types";
import { baseURL } from "../../services";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import {
  PencilSimpleLineIcon,
  StarIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

// margin tier helpers
function getMarginTier(pct) {
  if (pct == null) return null;
  const n = Number(pct);
  if (n >= 50) return { label: "High Margin", dot: "🟢", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  if (n >= 25) return { label: "Medium Margin", dot: "🟡", cls: "bg-yellow-50 text-yellow-700 border border-yellow-200" };
  return { label: "Low Margin", dot: "🔴", cls: "bg-red-50 text-red-700 border border-red-200" };
}

export default function AdminMenuItem({
  item,
  onEdit,
  onDelete,
}) {
  const [imgError, setImgError] = useState(false);

  const computeImageSrc = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${baseURL}${url}`;
  };

  const imageSrc = computeImageSrc(item.imageUrl);
  const veg =
    item.isVeg === true ||
    item.isVeg === "true" ||
    item.isVeg === 1 ||
    item.isVeg === "1";

  const hasCost = item.estimatedCost != null && Number(item.estimatedCost) >= 0;
  const isActive = item.available;
  const missingCostOnActive = isActive && !hasCost;

  const marginPct =
    hasCost && item.price && Number(item.price) > 0
      ? (
          ((Number(item.price) - Number(item.estimatedCost)) /
            Number(item.price)) *
          100
        ).toFixed(1)
      : null;

  const marginTier = getMarginTier(marginPct);

  return (
    <article
      className={cn(
        "group p-2.5 sm:p-3 bg-card border border-border rounded-lg transition-colors hover:border-primary/20 hover:shadow-sm",
      )}
    >
      <div className="flex gap-2.5 sm:gap-3">
        {/* IMAGE */}
        <div className="relative size-20 sm:w-20 sm:h-20 shrink-0 rounded-md overflow-hidden bg-muted">
          {imageSrc && !imgError ? (
            <img
              src={imageSrc}
              alt={item.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/25 to-primary">
              <img
                src="/brand/white.png"
                alt="Bro Logo"
                className="opacity-20 object-contain size-1/2 animate-pulse"
              />
            </div>
          )}

          <div
            title={veg ? "Veg" : "Non Veg"}
            className={cn(
              "absolute top-1 left-1 sm:top-1.5 sm:left-1.5 p-1 border-2 bg-white rounded-sm size-4 sm:size-5 flex items-center",
              veg ? "border-accent-400" : "border-red-600",
            )}
          >
            <span
              className={cn(
                "size-full rounded-full",
                veg ? "bg-accent-400" : "bg-red-600",
              )}
            />
          </div>
        </div>

        {/* MIDDLE */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 sm:gap-1.5">
          <h3 className="font-semibold text-sm sm:text-base truncate min-w-0">
            {item.name}
          </h3>
          <div className="flex gap-1 items-center">
            {item.category?.name && (
              <span className="shrink-0 text-xs text-secondary-foreground capitalize">
                {item.category.name}
              </span>
            )}
            {item.category?.name && item.tag?.name && (
              <span className="shrink-0 text-xs text-muted-foreground">•</span>
            )}
            {item.tag?.name && (
              <span className="text-xs text-secondary-foreground">
                {item.tag.name}
              </span>
            )}
          </div>

          <p className="text-sm sm:text-base font-semibold leading-none">
            ₹{item.price}
          </p>

          <div className="flex flex-wrap gap-1">
            {item.recommended && (
              <Badge className="bg-amber-100 text-amber-800">
                <StarIcon weight="fill" />
                Recommended
              </Badge>
            )}
            {missingCostOnActive ? (
              <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
                <WarningCircleIcon weight="fill" className="size-3" />
                Cost Missing
              </Badge>
            ) : marginTier ? (
              <Badge className={marginTier.cls}>
                {marginTier.dot} {marginTier.label}
              </Badge>
            ) : null}
            {!item.imageUrl && (
              <Badge className="bg-zinc-100 text-zinc-500 border border-zinc-200">
                No Image
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => onEdit(item)}
          className="flex-1 h-8 px-3"
        >
          <PencilSimpleLineIcon data-icon="inline-start" />
          Edit
        </Button>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                size="icon"
              >
                <TrashIcon className="size-4" />
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete{" "}
                <span className="font-medium">{item.name}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-sm! font-medium! rounded-md!">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="text-sm! font-medium! rounded-md!"
                onClick={() => onDelete(item)}
              >
                Yes, Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </article>
  );
}

AdminMenuItem.propTypes = {
  item: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
