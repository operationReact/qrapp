import PropTypes from "prop-types";
import { CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isCampaignActionable, runCampaignAction } from "./campaignActions";
import {
  DEFAULT_TYPOGRAPHY,
  getCampaignAnimationConfig,
  getCampaignImage,
  getEffectiveCampaignStyle,
  getTypographyPreset,
} from "./campaignPresentation";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=1200&auto=format&fit=crop";

function textStyle(preset) {
  const typography = getTypographyPreset(preset);
  return {
    fontFamily: typography.cssFamily,
    fontWeight: typography.weight,
  };
}

export default function CampaignPresentation({
  campaign,
  handlers,
  preview = false,
  previewMode = "desktop",
  replayKey = 0,
  fallbackImage = FALLBACK_IMAGE,
  className,
  eager = false,
}) {
  const placement = campaign?.type ?? "HERO";
  const style = getEffectiveCampaignStyle(campaign);
  const animation = getCampaignAnimationConfig({
    animationPreset: style.animationPreset,
    animationIntensity: style.animationIntensity,
    isActive: campaign?.isActive !== false,
    placement,
  });
  const actionable = isCampaignActionable(campaign);
  const image = getCampaignImage(campaign, preview ? previewMode : "desktop") || fallbackImage;
  const mobileImage = campaign?.mobileImageUrl || campaign?.imageUrl || fallbackImage;
  const showCta = Boolean(campaign?.ctaLabel) && (preview || actionable);

  return (
    <div
      key={replayKey}
      data-placement={placement}
      data-animation={animation.value}
      data-animation-intensity={animation.intensity}
      data-animation-group={animation.group}
      className={cn(
        "campaign-presentation relative h-full w-full overflow-hidden bg-zinc-800",
        `campaign-placement-${placement.toLowerCase()}`,
        className,
      )}
    >
      <picture className="absolute inset-0 block h-full w-full">
        {mobileImage && (!preview || previewMode === "mobile") && (
          <source media="(max-width: 639px)" srcSet={mobileImage} />
        )}
        <img
          src={image}
          alt=""
          aria-hidden
          draggable="false"
          loading={eager ? "eager" : "lazy"}
          className={cn(
            "campaign-background absolute inset-0 h-full w-full object-cover",
            animation.enabled &&
              ["zoom", "drift", "parallax", "focus"].includes(animation.effect) &&
              "campaign-effect-background",
          )}
        />
      </picture>
      <div
        className={cn(
          "campaign-scrim absolute inset-0",
          animation.enabled && animation.effect === "sweep" && "campaign-effect-sweep",
        )}
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.06) 68%, rgba(0,0,0,0.34) 100%)",
        }}
      />
      <div
        className={cn(
          "campaign-content absolute inset-x-0 bottom-9 z-10 px-4",
          animation.effectClass,
        )}
      >
        {campaign?.badge && (
          <span
            className={cn(
              "campaign-badge mb-2 inline-block rounded-md bg-primary px-2.5 py-1 text-[11px] uppercase tracking-wide text-primary-foreground shadow-lg",
              animation.enabled && animation.effect === "premium" && "campaign-effect-badge",
              animation.enabled && animation.effect === "pulse" && "campaign-effect-pulse",
            )}
            style={textStyle(campaign.badgeTypographyPreset ?? style.titleTypographyPreset ?? DEFAULT_TYPOGRAPHY)}
          >
            {campaign.badge}
          </span>
        )}
        {campaign?.title && (
          <h2
            className={cn(
              "campaign-title max-w-[78%] text-3xl leading-none text-white drop-shadow-lg sm:text-4xl",
              animation.enabled && animation.effect === "premium" && "campaign-effect-title",
            )}
            style={textStyle(style.titleTypographyPreset)}
          >
            {campaign.title}
          </h2>
        )}
        {campaign?.subtitle && (
          <p
            className={cn(
              "campaign-subtitle mt-1.5 max-w-[78%] text-sm text-white/90 drop-shadow",
              animation.enabled && animation.effect === "premium" && "campaign-effect-subtitle",
            )}
            style={textStyle(style.subtitleTypographyPreset)}
          >
            {campaign.subtitle}
          </p>
        )}
        {showCta && (
          <Button
            size="sm"
            className={cn(
              "campaign-cta mt-3 rounded-full bg-amber-400 text-zinc-900 shadow-lg hover:bg-amber-300",
              preview && !actionable && "pointer-events-none opacity-80",
              animation.enabled && animation.effect === "premium" && "campaign-effect-cta",
              animation.enabled && animation.effect === "pulse" && "campaign-effect-pulse",
            )}
            aria-disabled={preview && !actionable ? "true" : undefined}
            onClick={() => actionable && runCampaignAction(campaign, handlers)}
          >
            <span style={textStyle(style.ctaTypographyPreset)}>{campaign.ctaLabel}</span>
            <CaretRightIcon weight="bold" />
          </Button>
        )}
      </div>
    </div>
  );
}

CampaignPresentation.propTypes = {
  campaign: PropTypes.object,
  handlers: PropTypes.object,
  preview: PropTypes.bool,
  previewMode: PropTypes.oneOf(["mobile", "desktop"]),
  replayKey: PropTypes.number,
  fallbackImage: PropTypes.string,
  className: PropTypes.string,
  eager: PropTypes.bool,
};
