import { useState } from "react";
import PropTypes from "prop-types";
import { baseURL } from "../../services";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel } from "../ui/field";
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
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

export default function AdminMenuItem({
  item,
  onEdit,
  onDelete,
  onToggleRecommended,
}) {
  const [imgError, setImgError] = useState(false);
  const [togglingRecommended, setTogglingRecommended] = useState(false);

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

  const handleRecommendedToggle = async () => {
    setTogglingRecommended(true);
    await onToggleRecommended(item.id, !item.recommended);
    setTogglingRecommended(false);
  };

  return (
    <article className="group p-2.5 sm:p-3 bg-card border border-border rounded-lg transition-colors hover:border-primary/20 hover:shadow-sm">
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
          <div className="flex flex-col min-w-0">
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
                <span className="shrink-0 text-xs text-muted-foreground">
                  •
                </span>
              )}
              {item.tag?.name && (
                <span className="text-xs text-secondary-foreground">
                  {item.tag.name}
                </span>
              )}
            </div>
          </div>

          {item.description && (
            <p className="hidden sm:block text-xs text-muted-foreground line-clamp-1">
              {item.description}
            </p>
          )}

          {item.recommended && (
            <div className="flex flex-wrap gap-1">
              <Badge className="bg-amber-100 text-amber-800">
                <StarIcon weight="fill" />
                Recommended
              </Badge>
            </div>
          )}

          <p className="text-sm sm:text-base font-semibold leading-none mt-auto">
            ₹{item.price}
          </p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Field orientation="horizontal" className="py-2 w-full sm:w-fit">
          <FieldLabel htmlFor="recommended" className="text-sm font-medium">
            Recommended
          </FieldLabel>
          <Switch
            id="recommended"
            checked={item.recommended}
            onCheckedChange={handleRecommendedToggle}
            disabled={togglingRecommended}
          />
        </Field>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onEdit(item)}
            className="flex-1 sm:flex-none h-8 px-3"
          >
            <PencilSimpleLineIcon data-icon="inline-start" />
            Edit
          </Button>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="destructive"
                  className="flex-1 sm:flex-none h-8 px-3"
                >
                  <TrashIcon data-icon="inline-start" />
                  Delete
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
      </div>
    </article>
  );
}

AdminMenuItem.propTypes = {
  item: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggleRecommended: PropTypes.func.isRequired,
};
