import { useRef, useState } from "react";
import PropTypes from "prop-types";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
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
import CampaignPresentation from "@/components/home/CampaignPresentationView";
import {
  ANIMATION_OPTIONS,
  ANIMATION_INTENSITIES,
  PLACEMENT_OPTIONS,
  STYLE_PRESETS,
  TYPOGRAPHY_PRESETS,
  getEffectiveCampaignStyle,
  getAnimationLabel,
} from "@/components/home/campaignPresentation";

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
  const initialStyle = getEffectiveCampaignStyle(initialData ?? {});
  const [stylePreset, setStylePreset] = useState(initialData?.stylePreset ?? "CUSTOM");
  const [titleTypographyPreset, setTitleTypographyPreset] = useState(initialStyle.titleTypographyPreset ?? "MODERN");
  const [subtitleTypographyPreset, setSubtitleTypographyPreset] = useState(initialStyle.subtitleTypographyPreset ?? "ELEGANT");
  const [ctaTypographyPreset, setCtaTypographyPreset] = useState(initialStyle.ctaTypographyPreset ?? "IMPACT");
  const [animationPreset, setAnimationPreset] = useState(initialStyle.animationPreset);
  const [animationIntensity, setAnimationIntensity] = useState(initialStyle.animationIntensity);
  const [displayOrder, setDisplayOrder] = useState(initialData?.displayOrder ?? 0);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(toLocalDateTimeInput(initialData?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalDateTimeInput(initialData?.endsAt));
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [targetError, setTargetError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [previewMode, setPreviewMode] = useState("mobile");
  const [previewKey, setPreviewKey] = useState(0);

  const fileInputRef = useRef(null);
  const mobileFileInputRef = useRef(null);

  const typeOptions =
    type && !PLACEMENT_OPTIONS.some((t) => t.value === type)
      ? [...PLACEMENT_OPTIONS, { value: type, label: `${type} (legacy, read-only)` }]
      : PLACEMENT_OPTIONS;

  const previewCampaign = {
    ...initialData,
    type,
    badge,
    title,
    subtitle,
    ctaLabel,
    imageUrl: initialData?.imageUrl ?? null,
    mobileImageUrl: initialData?.mobileImageUrl ?? null,
    targetType,
    targetId,
    stylePreset,
    titleTypographyPreset,
    subtitleTypographyPreset,
    ctaTypographyPreset,
    animationPreset,
    animationIntensity,
  };

  const markCustom = (setter) => (value) => {
    setStylePreset("CUSTOM");
    setter(value);
  };

  const applyStylePreset = (value) => {
    setStylePreset(value);
    const preset = STYLE_PRESETS[value];
    if (!preset || value === "CUSTOM") return;
    setTitleTypographyPreset(preset.titleTypographyPreset);
    setSubtitleTypographyPreset(preset.subtitleTypographyPreset);
    setCtaTypographyPreset(preset.ctaTypographyPreset);
    setAnimationPreset(preset.animationPreset);
    setAnimationIntensity(preset.animationIntensity);
  };

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
      stylePreset,
      titleTypographyPreset,
      subtitleTypographyPreset,
      ctaTypographyPreset,
      animationPreset,
      animationIntensity,
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
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setScheduleError("End date and time must be after the start date and time.");
      return;
    }
    setScheduleError("");
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
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col [&_[data-slot=input]]:min-h-11">
      <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain px-1 pb-2 sm:space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start lg:gap-6 lg:space-y-0">
      <aside className="min-w-0 rounded-xl border bg-muted/20 p-3 lg:sticky lg:top-0">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Live Preview</p>
            <p className="text-xs text-muted-foreground">{type === "HERO" ? "Hero Billboard" : type}</p>
          </div>
          <div className="flex rounded-lg border bg-background p-0.5" aria-label="Preview mode">
            {["mobile", "desktop"].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`min-h-9 rounded-md px-2.5 text-xs font-medium capitalize ${
                  previewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
                aria-pressed={previewMode === mode}
                onClick={() => setPreviewMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="aspect-[4/3] w-full overflow-hidden rounded-xl sm:aspect-video">
          <CampaignPresentation
            key={previewKey}
            campaign={previewCampaign}
            preview
            previewMode={previewMode}
            replayKey={previewKey}
            className="h-full"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={() => setPreviewKey((key) => key + 1)}
        >
          Replay Animation: {getAnimationLabel(animationPreset)}
        </Button>
      </aside>

      <div className="min-w-0 space-y-4">
      <div className="border-t pt-4">
        <p className="mb-3 text-sm font-semibold">Media</p>
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
              className="min-h-11 gap-1.5"
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
                className="min-h-11 gap-1.5"
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
              className="min-h-11 gap-1.5"
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
              className="min-h-11 gap-1.5"
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
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="hc-type">Placement *</FieldLabel>
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
            <FieldDescription>Choose where this campaign appears on the customer Home page.</FieldDescription>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="hc-location">Location *</FieldLabel>
          <FieldContent>
            <Select
              value={locationId || "__GLOBAL__"}
              onValueChange={(value) => setLocationId(value === "__GLOBAL__" ? "" : value)}
              disabled={!canGlobal && !!initialData}
            >
              <SelectTrigger id="hc-location" className="h-9 w-full max-w-full">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-1.5rem)]">
                {canGlobal && <SelectItem value="__GLOBAL__">Global (all locations)</SelectItem>}
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={String(loc.id)}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
      </div>
      <div className="border-t pt-4">
        <p className="mb-3 text-sm font-semibold">Content</p>
      <Field>
        <FieldLabel htmlFor="hc-title">Title *</FieldLabel>
        <FieldContent>
          <Input id="hc-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={60} placeholder="BIRYANI FEST" />
          <FieldDescription>{title.length}/60 characters</FieldDescription>
        </FieldContent>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="hc-badge">Badge</FieldLabel>
          <FieldContent>
            <Input id="hc-badge" value={badge} onChange={(e) => setBadge(e.target.value)} maxLength={30} placeholder="UP TO 70% OFF" />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="hc-cta">CTA label</FieldLabel>
          <FieldContent>
            <Input id="hc-cta" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={20} placeholder="Order Now" />
          </FieldContent>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="hc-subtitle">Subtitle</FieldLabel>
        <FieldContent>
          <Input id="hc-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={100} placeholder="Biryani & Specials" />
          <FieldDescription>{subtitle.length}/100 characters</FieldDescription>
        </FieldContent>
      </Field>
      </div>

      <div className="border-t pt-4">
        <div className="mb-3">
          <p className="text-sm font-semibold">Campaign Style</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start with a curated style or customize each presentation setting.
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="hc-style-preset">Style preset</FieldLabel>
          <FieldContent>
            <Select value={stylePreset} onValueChange={applyStylePreset}>
              <SelectTrigger id="hc-style-preset" className="h-11 w-full max-w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-1.5rem)]">
                {Object.entries(STYLE_PRESETS).map(([preset, option]) => (
                  <SelectItem key={preset} value={preset} className="min-h-11">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>

        {stylePreset !== "CUSTOM" ? (
          <div className="mt-2 flex flex-col gap-2 rounded-lg bg-muted/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {STYLE_PRESETS[stylePreset]?.label} applies matched typography, animation, and{" "}
              {STYLE_PRESETS[stylePreset]?.animationIntensity?.toLowerCase()} intensity.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setStylePreset("CUSTOM")} className="min-h-10 shrink-0">
              Customize
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["Title", titleTypographyPreset, setTitleTypographyPreset, "hc-title-style"],
                ["Subtitle", subtitleTypographyPreset, setSubtitleTypographyPreset, "hc-subtitle-style"],
                ["CTA", ctaTypographyPreset, setCtaTypographyPreset, "hc-cta-style"],
              ].map(([label, value, setter, id]) => (
                <Field key={id}>
                  <FieldLabel htmlFor={id}>{label} Style</FieldLabel>
                  <FieldContent>
                    <Select value={value} onValueChange={markCustom(setter)}>
                      <SelectTrigger id={id} className="h-11 w-full max-w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-w-[calc(100vw-1.5rem)]">
                        {Object.entries(TYPOGRAPHY_PRESETS).map(([preset, option]) => (
                          <SelectItem key={preset} value={preset} className="min-h-11">
                            <span style={{ fontFamily: option.cssFamily, fontWeight: option.weight }}>
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="hc-animation">Animation preset</FieldLabel>
                <FieldContent>
                  <Select value={animationPreset} onValueChange={markCustom(setAnimationPreset)}>
                    <SelectTrigger id="hc-animation" className="h-11 w-full max-w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-w-[calc(100vw-1.5rem)]">
                      {["Subtle", "Premium", "Cinematic", "Dynamic"].map((group) => (
                        <SelectGroup key={group}>
                          <SelectLabel>{group}</SelectLabel>
                          {ANIMATION_OPTIONS.filter((option) => option.group === group).map((option) => (
                            <SelectItem key={option.value} value={option.value} className="min-h-11">
                              <span className="flex flex-col">
                                <span className="font-medium">{option.label}</span>
                                <span className="text-xs text-muted-foreground">{option.description}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="hc-animation-intensity">Animation intensity</FieldLabel>
                <FieldContent>
                  <Select value={animationIntensity} onValueChange={markCustom(setAnimationIntensity)}>
                    <SelectTrigger id="hc-animation-intensity" className="h-11 w-full max-w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-w-[calc(100vw-1.5rem)]">
                      {ANIMATION_INTENSITIES.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="min-h-11">
                          <span className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            </div>
          </div>
        )}
      </div>

      <section className="space-y-3 rounded-2xl border border-[#E6E0DB] bg-[#FFFCF9]/70 p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold text-[#2B2928]">Tap Behavior</h2>
          <p className="mt-1 text-xs leading-5 text-[#77716D]">
            Choose what happens when customers tap this campaign.
          </p>
        </div>

        <div className={targetType === "NONE" || targetType === "PARTY_ORDER" ? "grid grid-cols-1" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
          <Field>
            <FieldLabel htmlFor="hc-target-type">Tap Behavior</FieldLabel>
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
              <FieldDescription>Choose what happens when customers tap this campaign.</FieldDescription>
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
            <Select value={visualVariant || "__AUTO__"} onValueChange={(value) => setVisualVariant(value === "__AUTO__" ? "" : value)}>
              <SelectTrigger id="hc-visual" className="h-9 w-full max-w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-1.5rem)]">
                <SelectItem value="__AUTO__">Auto</SelectItem>
                {VISUAL_VARIANTS.filter(Boolean).map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
      {scheduleError && <p className="text-sm text-destructive" role="alert">{scheduleError}</p>}

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
