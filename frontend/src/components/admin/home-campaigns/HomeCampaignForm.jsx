import { useRef, useState } from "react";
import PropTypes from "prop-types";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  CheckIcon,
  CaretUpDownIcon,
  ImageIcon,
  TrashIcon,
  UploadSimpleIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { canSelectAllLocations } from "@/lib/roles";
import { adminLocationsOptions } from "@/query/options/management";
import { categoriesOptions } from "@/query/options/menu";

const BASE_TYPE_OPTIONS = [{ value: "HERO", label: "Hero billboard" }];

const TARGET_TYPE_OPTIONS = [
  { value: "NONE", label: "No action" },
  { value: "CATEGORY", label: "Jump to category" },
  { value: "COMBO", label: "Open Combos / BYOC" },
  { value: "PARTY_ORDER", label: "Open Party Order form" },
  { value: "EXTERNAL", label: "Open external link" },
  { value: "MENU_ITEM", label: "Menu item (reserved)" },
  { value: "CAMPAIGN", label: "Campaign (reserved)" },
];

const VISUAL_VARIANTS = [
  "",
  "GREEN_DEAL",
  "RED_PARTY",
  "PURPLE_PREMIUM",
  "ORANGE_FOOD",
  "DARK_LUXURY",
];

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

function CategoryPicker({ categories, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selectedCategory = categories.find((category) => category.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-[50px] w-full max-w-full items-center justify-between gap-2 rounded-[13px] border border-[#E6E0DB] bg-[#FFFCF9] px-3.5 text-left text-[15px] font-medium text-[#77716D] shadow-none outline-none transition focus-visible:border-[#FF2438] focus-visible:ring-2 focus-visible:ring-[#FF2438]/20"
        >
          <span className={selectedCategory ? "truncate text-[#2B2928]" : "truncate"}>
            {selectedCategory?.name ?? value ?? "Select category…"}
          </span>
          <CaretUpDownIcon className="size-4 shrink-0 text-[#9A918B]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--anchor-width)] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[13px] border-[#E6E0DB] bg-[#FFFCF9] p-0"
      >
        <Command>
          <CommandInput placeholder="Search categories…" className="h-10 text-sm" />
          <CommandList>
            <CommandEmpty className="py-5 text-center text-sm text-[#77716D]">
              No categories found.
            </CommandEmpty>
            <CommandGroup>
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => {
                    onChange(category.name);
                    setOpen(false);
                  }}
                  className="min-h-11 cursor-pointer rounded-[10px] px-3 text-sm data-[selected=true]:bg-[#FF2438]/10 data-[selected=true]:text-[#D91E31]"
                >
                  <CheckIcon
                    className={`mr-2 size-4 shrink-0 ${
                      category.name === value ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className="truncate">{category.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

CategoryPicker.propTypes = {
  categories: PropTypes.arrayOf(PropTypes.object).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

function toLocalDateTimeInput(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}

/**
 * Create/edit form for a Home campaign. Image upload only becomes available
 * once the campaign has been saved (the backend keys uploaded images under
 * `home-campaigns/{id}`), mirroring the existing Location photo upload flow.
 */
export default function HomeCampaignForm({
  initialData,
  onSubmit,
  submitting,
  onUploadImage,
  onRemoveImage,
  uploadingImage,
  onOpenAIModal,
  onCancel,
}) {
  const { user } = useAuth();
  const { activeLocationId } = useActiveLocation();
  const canGlobal = canSelectAllLocations(user);
  const { data: locations = [] } = useQuery(adminLocationsOptions());
  const { data: categories = [] } = useQuery(categoriesOptions(activeLocationId));

  const [type, setType] = useState(initialData?.type ?? "HERO");
  const [locationId, setLocationId] = useState(
    initialData ? (initialData.locationId ?? "") : (canGlobal ? "" : String(activeLocationId ?? "")),
  );
  const [badge, setBadge] = useState(initialData?.badge ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [subtitle, setSubtitle] = useState(initialData?.subtitle ?? "");
  const [ctaLabel, setCtaLabel] = useState(initialData?.ctaLabel ?? "");
  const [targetType, setTargetType] = useState(initialData?.targetType ?? "NONE");
  const [targetId, setTargetId] = useState(initialData?.targetId ?? "");
  const [visualVariant, setVisualVariant] = useState(initialData?.visualVariant ?? "");
  const [displayOrder, setDisplayOrder] = useState(initialData?.displayOrder ?? 0);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(toLocalDateTimeInput(initialData?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalDateTimeInput(initialData?.endsAt));
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [targetError, setTargetError] = useState("");

  const fileInputRef = useRef(null);
  const mobileFileInputRef = useRef(null);

  const typeOptions =
    type && !BASE_TYPE_OPTIONS.some((t) => t.value === type)
      ? [...BASE_TYPE_OPTIONS, { value: type, label: `${type} (legacy, read-only)` }]
      : BASE_TYPE_OPTIONS;

  const buildPayload = () => ({
      type,
      locationId: locationId === "" ? null : Number(locationId),
      badge: badge.trim() || null,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      ctaLabel: ctaLabel.trim() || null,
      imageUrl: initialData?.imageUrl ?? null,
      mobileImageUrl: initialData?.mobileImageUrl ?? null,
      targetType,
      targetId: targetId.trim() || null,
      visualVariant: visualVariant || null,
      displayOrder: Number(displayOrder) || 0,
      isActive,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (targetType === "EXTERNAL" && !isValidHttpUrl(targetId.trim())) {
      setTargetError("Enter a valid http:// or https:// URL.");
      return;
    }
    onSubmit(buildPayload(), { imageFile: pendingImageFile });
  };

  const handleGenerateWithAI = () => {
    if (!title.trim() || !onOpenAIModal) return;
    if (initialData?.id) {
      onOpenAIModal(initialData.id, initialData.title);
      return;
    }
    onOpenAIModal({ data: buildPayload() });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain px-1 pb-2 sm:space-y-5">
      {/* Live preview — a lightweight stand-in for the immersive Hero slide
          (billboard image + gradient scrim + badge/title/subtitle/CTA). */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Live preview
        </p>
        <div className="relative h-36 w-full max-w-[320px] overflow-hidden rounded-xl bg-zinc-800">
          {initialData?.mobileImageUrl || initialData?.imageUrl ? (
            <img
              src={initialData?.mobileImageUrl || initialData?.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.05) 65%, rgba(0,0,0,0.35) 100%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-3 px-3">
            {badge && (
              <span className="mb-1.5 inline-block rounded-md bg-primary px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground shadow">
                {badge}
              </span>
            )}
            <h3 className="max-w-[80%] text-lg font-extrabold leading-none text-white drop-shadow">
              {title || "Campaign title"}
            </h3>
            {subtitle && (
              <p className="mt-1 max-w-[80%] text-xs font-semibold text-white/90 drop-shadow">
                {subtitle}
              </p>
            )}
            {ctaLabel && (
              <span className="mt-2 inline-block rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold text-zinc-900 shadow">
                {ctaLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {initialData?.id && (
        <div className="space-y-2">
          <Label>Campaign image</Label>
          <div className="flex flex-wrap items-center gap-2">
            {initialData.imageUrl && (
              <img
                src={initialData.imageUrl}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
              />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadImage(file, { mobile: false });
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingImage}
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <UploadSimpleIcon className="size-4" />
              {initialData.imageUrl ? "Replace" : "Upload"}
            </Button>
            {onOpenAIModal && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingImage}
                onClick={() => onOpenAIModal(initialData.id, initialData.title)}
                className="gap-1.5"
              >
                <SparkleIcon className="size-4" />
                Generate with AI
              </Button>
            )}
            {initialData.imageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onRemoveImage({ mobile: false })}
              >
                <TrashIcon className="size-4" />
              </Button>
            )}
          </div>

          <Label className="mt-2">Mobile image (optional, used by the hero)</Label>
          <div className="flex flex-wrap items-center gap-2">
            {initialData.mobileImageUrl && (
              <img
                src={initialData.mobileImageUrl}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
              />
            )}
            <input
              ref={mobileFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadImage(file, { mobile: true });
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingImage}
              onClick={() => mobileFileInputRef.current?.click()}
              className="gap-1.5"
            >
              <ImageIcon className="size-4" />
              {initialData.mobileImageUrl ? "Replace" : "Upload"}
            </Button>
            {initialData.mobileImageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onRemoveImage({ mobile: true })}
              >
                <TrashIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      {!initialData?.id && (
        <div className="space-y-2">
          <Label>Campaign image</Label>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                setPendingImageFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <UploadSimpleIcon className="size-4" />
              Upload Image
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateWithAI}
              disabled={!onOpenAIModal}
              className="gap-1.5"
            >
              <SparkleIcon className="size-4" />
              Generate with AI
            </Button>
            {pendingImageFile && (
              <span className="text-xs text-muted-foreground">
                <span className="min-w-0 max-w-full truncate">{pendingImageFile.name}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Upload an image now, or save this campaign draft to generate a hero image with AI.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="hc-type">Rail *</FieldLabel>
          <FieldContent>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger
                id="hc-type"
                className="h-9 w-full max-w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-1.5rem)]">
                {typeOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="min-h-10">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="hc-location">Location *</FieldLabel>
          <FieldContent>
            <select
              id="hc-location"
              value={locationId}
              disabled={!canGlobal && !!initialData}
              onChange={(e) => setLocationId(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              {canGlobal && <option value="">🌐 Global (all locations)</option>}
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </FieldContent>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="hc-title">Title *</FieldLabel>
        <FieldContent>
          <Input id="hc-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="BIRYANI FEST" />
        </FieldContent>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="hc-badge">Badge</FieldLabel>
          <FieldContent>
            <Input id="hc-badge" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="UP TO 70% OFF" />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="hc-cta">CTA label</FieldLabel>
          <FieldContent>
            <Input id="hc-cta" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Order Now" />
          </FieldContent>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="hc-subtitle">Subtitle</FieldLabel>
        <FieldContent>
          <Input id="hc-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Biryani & Specials" />
        </FieldContent>
      </Field>

      <section className="space-y-3 rounded-2xl border border-[#E6E0DB] bg-[#FFFCF9]/70 p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold text-[#2B2928]">Tap Behavior</h2>
          <p className="mt-1 text-xs leading-5 text-[#77716D]">
            Choose what happens when customers tap this campaign.
          </p>
        </div>

        <div className={targetType === "NONE" || targetType === "PARTY_ORDER" ? "grid grid-cols-1" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
          <Field>
            <FieldLabel htmlFor="hc-target-type">Tap action</FieldLabel>
            <FieldContent>
              <Select
                value={targetType}
                onValueChange={(value) => {
                  setTargetType(value);
                  setTargetError("");
                }}
              >
                <SelectTrigger
                  id="hc-target-type"
                  className="h-[50px] w-full max-w-full rounded-[13px] border-[#E6E0DB] bg-[#FFFCF9] px-3.5 text-[15px] font-medium text-[#77716D] shadow-none focus-visible:border-[#FF2438] focus-visible:ring-2 focus-visible:ring-[#FF2438]/20"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-1.5rem)] border-[#E6E0DB] bg-[#FFFCF9] p-1">
                  {TARGET_TYPE_OPTIONS.map((t) => (
                    <SelectItem
                      key={t.value}
                      value={t.value}
                      className="min-h-11 rounded-[10px] px-3 py-2.5 text-sm data-[selected]:font-semibold data-[selected]:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
                    >
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          {targetType === "CATEGORY" && (
            <Field>
              <FieldLabel htmlFor="hc-target-category">Category</FieldLabel>
              <FieldContent>
                <CategoryPicker
                  categories={categories}
                  value={targetId}
                  onChange={setTargetId}
                />
              </FieldContent>
            </Field>
          )}

          {targetType === "COMBO" && (
            <Field>
              <FieldLabel htmlFor="hc-target-combo">Combo destination</FieldLabel>
              <FieldContent>
                <Select
                  value={targetId === "byoc" ? "byoc" : "combos"}
                  onValueChange={(value) => setTargetId(value === "byoc" ? "byoc" : "")}
                >
                  <SelectTrigger
                    id="hc-target-combo"
                    className="h-[50px] w-full max-w-full rounded-[13px] border-[#E6E0DB] bg-[#FFFCF9] px-3.5 text-[15px] font-medium text-[#77716D] shadow-none focus-visible:border-[#FF2438] focus-visible:ring-2 focus-visible:ring-[#FF2438]/20"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-1.5rem)] border-[#E6E0DB] bg-[#FFFCF9] p-1">
                    <SelectItem value="combos" className="min-h-11 rounded-[10px] px-3 text-sm data-[selected]:font-semibold data-[selected]:text-primary">
                      Combos
                    </SelectItem>
                    <SelectItem value="byoc" className="min-h-11 rounded-[10px] px-3 text-sm data-[selected]:font-semibold data-[selected]:text-primary">
                      Build Your Own
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}

          {targetType === "EXTERNAL" && (
            <Field>
              <FieldLabel htmlFor="hc-target-url">URL</FieldLabel>
              <FieldContent>
                <Input
                  id="hc-target-url"
                  type="url"
                  value={targetId}
                  onChange={(e) => {
                    setTargetId(e.target.value);
                    setTargetError("");
                  }}
                  onBlur={() => {
                    if (targetId.trim() && !isValidHttpUrl(targetId.trim())) {
                      setTargetError("Enter a valid http:// or https:// URL.");
                    }
                  }}
                  placeholder="https://example.com"
                  aria-invalid={Boolean(targetError)}
                  className={targetError ? "border-destructive focus-visible:ring-destructive/20" : ""}
                />
                {targetError && <p className="mt-1 text-xs text-destructive">{targetError}</p>}
              </FieldContent>
            </Field>
          )}

          {(targetType === "MENU_ITEM" || targetType === "CAMPAIGN") && (
            <Field>
              <FieldLabel htmlFor="hc-target-reserved">Target</FieldLabel>
              <FieldContent>
                <Input
                  id="hc-target-reserved"
                  value={targetId}
                  disabled
                  placeholder="Target configuration coming soon"
                  className="bg-muted/40 text-muted-foreground"
                />
                <p className="mt-1 text-xs text-[#77716D]">
                  Coming soon — customer navigation is not implemented yet.
                </p>
              </FieldContent>
            </Field>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="hc-visual">Visual style</FieldLabel>
          <FieldContent>
            <select
              id="hc-visual"
              value={visualVariant}
              onChange={(e) => setVisualVariant(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Auto</option>
              {VISUAL_VARIANTS.filter(Boolean).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="hc-order">Display order</FieldLabel>
          <FieldContent>
            <Input
              id="hc-order"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
            />
          </FieldContent>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="hc-starts">Starts at</FieldLabel>
          <FieldContent>
            <Input id="hc-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="hc-ends">Ends at</FieldLabel>
          <FieldContent>
            <Input id="hc-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </FieldContent>
        </Field>
      </div>

      <Field
        orientation="horizontal"
        className="flex-col! items-start gap-3 sm:flex-row! sm:items-center"
      >
        <FieldLabel htmlFor="hc-active">Active</FieldLabel>
        <FieldContent>
          <FieldDescription>Inactive campaigns never appear on the customer Home page.</FieldDescription>
        </FieldContent>
        <Switch id="hc-active" checked={isActive} onCheckedChange={setIsActive} />
      </Field>

      </div>
      <div className="sticky bottom-0 flex shrink-0 flex-col-reverse gap-2 border-t bg-popover/95 px-1 pt-3 backdrop-blur sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting || !title.trim()} className="w-full sm:w-auto">
          {submitting ? "Saving…" : initialData ? "Update Campaign" : "Create Campaign"}
        </Button>
      </div>
    </form>
  );
}

HomeCampaignForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  onUploadImage: PropTypes.func,
  onRemoveImage: PropTypes.func,
  uploadingImage: PropTypes.bool,
  onOpenAIModal: PropTypes.func,
  onCancel: PropTypes.func,
};
