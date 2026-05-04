import { useState } from "react";
import PropTypes from "prop-types";
import API from "../../services/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit2, Trash2, Star, Eye, EyeOff } from "lucide-react";
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

export default function AdminMenuItem({
  item,
  onEdit,
  onDelete,
  onToggleAvailable,
  onToggleRecommended,
}) {
  const [imgError, setImgError] = useState(false);
  const [togglingAvailable, setTogglingAvailable] = useState(false);
  const [togglingRecommended, setTogglingRecommended] = useState(false);

  const computeImageSrc = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API.defaults.baseURL}${url}`;
  };

  const imageSrc = computeImageSrc(item.imageUrl);
  const veg =
    item.isVeg === true ||
    item.isVeg === "true" ||
    item.isVeg === 1 ||
    item.isVeg === "1";

  const handleAvailableToggle = async () => {
    setTogglingAvailable(true);
    await onToggleAvailable(item.id, !item.available);
    setTogglingAvailable(false);
  };

  const handleRecommendedToggle = async () => {
    setTogglingRecommended(true);
    await onToggleRecommended(item.id, !item.recommended);
    setTogglingRecommended(false);
  };

  return (
    <article className="group overflow-hidden rounded-xl border bg-white flex flex-col">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
        {imageSrc && !imgError ? (
          <img
            src={imageSrc}
            alt={item.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-linear-to-br from-primary/25 to-primary">
            <img
              src="/brand/white.png"
              alt="Bro Logo"
              className="opacity-20 object-contain size-1/2 animate-pulse"
            />
          </div>
        )}

        <div className="absolute left-0 right-0 bottom-0 bg-linear-[rgba(27,30,36,0)_0%,_rgb(27,30,36)_84.21%)] h-24" />

        <div
          title={veg ? "Veg" : "Non Veg"}
          className={`absolute top-3 left-3 p-1 border-2 bg-white rounded-md size-6 flex items-center gap-2 ${veg ? "border-accent-400" : "border-red-600"}`}
        >
          <span
            className={`size-full rounded-full ${veg ? "bg-accent-400" : "bg-red-600"}`}
          ></span>
        </div>

        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {item.recommended && (
            <Badge
              variant="secondary"
              className="bg-amber-400/90 hover:bg-amber-400/90 text-amber-950 font-semibold border-transparent shadow-sm"
            >
              <Star className="size-3.5 mr-1 fill-current" /> Recommended
            </Badge>
          )}
          <Badge
            variant="secondary"
            className={
              item.available
                ? "bg-emerald-500/90 hover:bg-emerald-500/90 text-white border-transparent"
                : "bg-rose-500/90 hover:bg-rose-500/90 text-white border-transparent"
            }
          >
            {item.available ? (
              <>
                <Eye className="size-3.5 mr-1" /> Available
              </>
            ) : (
              <>
                <EyeOff className="size-3.5 mr-1" /> Unavailable
              </>
            )}
          </Badge>
        </div>

        <div className="absolute flex justify-between left-0 bottom-0 right-0 px-2 py-2">
          <h3 className="line-clamp-1 text-lg font-semibold drop-shadow leading-tight text-white">
            {item.name}
          </h3>
          {item.tag && (
            <Badge className="bg-white text-black">{item.tag}</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1">
        <div className="grid grid-cols-[1fr_auto] gap-2 mb-2 pt-2 px-2">
          <div>
            <span className="text-sm font-medium text-secondary-foreground capitalize">
              {item.category}
            </span>
            <p className="line-clamp-2 leading-3.5 text-xs text-muted-foreground flex-1">
              {item.description || "No description added yet."}
            </p>
          </div>
          <span className="text-2xl font-bold">₹{item.price}</span>
        </div>

        <div className="pt-4 border-t grid gap-3 p-2 pb-0">
          <Field orientation="horizontal">
            <FieldLabel htmlFor="available">Available</FieldLabel>
            <Switch
              id="available"
              checked={item.available}
              onCheckedChange={handleAvailableToggle}
              disabled={togglingAvailable}
            />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="recommended">Recommended</FieldLabel>
            <Switch
              id="recommended"
              checked={item.recommended}
              onCheckedChange={handleRecommendedToggle}
              disabled={togglingRecommended}
            />
          </Field>
        </div>

        <div className="mt-4 px-2 pb-2 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 text-sm! font-medium! rounded-md"
            onClick={() => onEdit(item)}
          >
            <Edit2 className="size-4" />
            Edit
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="flex-1 rounded-md text-sm! font-medium! h-9"
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <span className="font-medium">{item.name}</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-sm! font-medium! rounded-md!">Cancel</AlertDialogCancel>
                <AlertDialogAction className="text-sm! font-medium! rounded-md!" onClick={() => onDelete(item)}>Yes, Delete</AlertDialogAction>
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
  onToggleAvailable: PropTypes.func.isRequired,
  onToggleRecommended: PropTypes.func.isRequired,
};
