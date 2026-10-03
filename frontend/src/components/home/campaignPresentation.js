export const PLACEMENT_OPTIONS = [
  { value: "HERO", label: "Hero Billboard" },
  { value: "DISCOVERY", label: "Discovery" },
  { value: "PROMOTION", label: "Promotions" },
];

export const TYPOGRAPHY_PRESETS = {
  MODERN: { label: "Modern Bold", family: "Poppins", cssFamily: "'Poppins', sans-serif", weight: 700 },
  PREMIUM: { label: "Premium", family: "Playfair Display", cssFamily: "'Playfair Display', serif", weight: 700 },
  FRESH: { label: "Fresh", family: "Montserrat", cssFamily: "'Montserrat', sans-serif", weight: 700 },
  ELEGANT: { label: "Elegant", family: "Cormorant Garamond", cssFamily: "'Cormorant Garamond', serif", weight: 600 },
  IMPACT: { label: "Impact", family: "Bebas Neue", cssFamily: "'Bebas Neue', sans-serif", weight: 700 },
  FRIENDLY: { label: "Friendly", family: "Nunito Sans", cssFamily: "'Nunito Sans', sans-serif", weight: 700 },
  MINIMAL: { label: "Minimal", family: "DM Sans", cssFamily: "'DM Sans', sans-serif", weight: 600 },
  EDITORIAL: { label: "Editorial", family: "Lora", cssFamily: "'Lora', serif", weight: 600 },
  POPPINS_BOLD: { label: "Poppins Bold", family: "Poppins", cssFamily: "'Poppins', sans-serif", weight: 700 },
  POPPINS_MEDIUM: { label: "Poppins Medium", family: "Poppins", cssFamily: "'Poppins', sans-serif", weight: 500 },
  POPPINS_SEMIBOLD: { label: "Poppins SemiBold", family: "Poppins", cssFamily: "'Poppins', sans-serif", weight: 600 },
  MONTSERRAT_BOLD: { label: "Montserrat Bold", family: "Montserrat", cssFamily: "'Montserrat', sans-serif", weight: 700 },
  MONTSERRAT_SEMIBOLD: { label: "Montserrat SemiBold", family: "Montserrat", cssFamily: "'Montserrat', sans-serif", weight: 600 },
  MONTSERRAT_EXTRABOLD: { label: "Montserrat ExtraBold", family: "Montserrat", cssFamily: "'Montserrat', sans-serif", weight: 800 },
  PLAYFAIR_DISPLAY_BOLD: { label: "Playfair Display Bold", family: "Playfair Display", cssFamily: "'Playfair Display', serif", weight: 700 },
  DM_SANS_REGULAR: { label: "DM Sans Regular", family: "DM Sans", cssFamily: "'DM Sans', sans-serif", weight: 400 },
  DM_SANS_MEDIUM: { label: "DM Sans Medium", family: "DM Sans", cssFamily: "'DM Sans', sans-serif", weight: 500 },
  DM_SANS_BOLD: { label: "DM Sans Bold", family: "DM Sans", cssFamily: "'DM Sans', sans-serif", weight: 700 },
  LORA_REGULAR: { label: "Lora Regular", family: "Lora", cssFamily: "'Lora', serif", weight: 400 },
  LORA_MEDIUM: { label: "Lora Medium", family: "Lora", cssFamily: "'Lora', serif", weight: 500 },
  RALEWAY_REGULAR: { label: "Raleway Regular", family: "Raleway", cssFamily: "'Raleway', sans-serif", weight: 400 },
  NUNITO_SANS_MEDIUM: { label: "Nunito Sans Medium", family: "Nunito Sans", cssFamily: "'Nunito Sans', sans-serif", weight: 500 },
  NUNITO_SANS_BOLD: { label: "Nunito Sans Bold", family: "Nunito Sans", cssFamily: "'Nunito Sans', sans-serif", weight: 700 },
  NUNITO_SANS_EXTRABOLD: { label: "Nunito Sans ExtraBold", family: "Nunito Sans", cssFamily: "'Nunito Sans', sans-serif", weight: 800 },
  MANROPE_SEMIBOLD: { label: "Manrope SemiBold", family: "Manrope", cssFamily: "'Manrope', sans-serif", weight: 600 },
  OSWALD_BOLD: { label: "Oswald Bold", family: "Oswald", cssFamily: "'Oswald', sans-serif", weight: 700 },
  BEBAS_NEUE_BOLD: { label: "Bebas Neue Bold", family: "Bebas Neue", cssFamily: "'Bebas Neue', sans-serif", weight: 700 },
  CORMORANT_GARAMOND_SEMIBOLD: { label: "Cormorant Garamond SemiBold", family: "Cormorant Garamond", cssFamily: "'Cormorant Garamond', serif", weight: 600 },
  CORMORANT_GARAMOND_BOLD: { label: "Cormorant Garamond Bold", family: "Cormorant Garamond", cssFamily: "'Cormorant Garamond', serif", weight: 700 },
};

export const DEFAULT_TYPOGRAPHY = {
  label: "Default",
  family: "Instrument Sans",
  cssFamily: "var(--base-font), sans-serif",
  weight: 700,
};

export const ANIMATION_INTENSITIES = [
  { value: "SUBTLE", label: "Subtle", description: "Quiet movement and emphasis" },
  { value: "MEDIUM", label: "Medium", description: "Balanced presentation" },
  { value: "BOLD", label: "Bold", description: "Stronger, still polished emphasis" },
];

const animation = (value, label, group, effect, description) => ({
  value,
  label,
  group,
  effect,
  description,
});

export const ANIMATION_OPTIONS = [
  animation("NONE", "None", "Subtle", "none", "Settled immediately"),
  animation("SOFT_FADE", "Soft Fade", "Subtle", "fade", "A gentle entrance"),
  animation("SLIDE_UP", "Slide Up", "Subtle", "slide", "Content rises into place"),
  animation("PREMIUM_REVEAL", "Premium Reveal", "Premium", "premium", "Layered entrance"),
  animation("CINEMATIC_DRIFT", "Cinematic Drift", "Cinematic", "drift", "Slow editorial movement"),
  animation("PARALLAX_DEPTH", "Parallax Depth", "Cinematic", "parallax", "Subtle depth between layers"),
  animation("LUXURY_REVEAL", "Luxury Reveal", "Premium", "luxury", "Refined layered reveal"),
  animation("GLASS_REVEAL", "Glass Reveal", "Premium", "glass", "Soft translucent reveal"),
  animation("LIGHT_SWEEP", "Light Sweep", "Premium", "sweep", "A single restrained highlight"),
  animation("SPOTLIGHT_REVEAL", "Spotlight Reveal", "Premium", "spotlight", "Focused content entrance"),
  animation("DEPTH_ZOOM", "Depth Zoom", "Cinematic", "zoom", "Slow dimensional zoom"),
  animation("SPLIT_REVEAL", "Split Reveal", "Cinematic", "split", "Content reveals in layers"),
  animation("MASK_REVEAL", "Mask Reveal", "Cinematic", "mask", "Clean editorial reveal"),
  animation("FLOATING_CONTENT", "Floating Content", "Subtle", "float", "Gentle content lift"),
  animation("STAGGERED_REVEAL", "Staggered Reveal", "Dynamic", "stagger", "Crisp sequential entrance"),
  animation("FOOD_FOCUS", "Food Focus", "Premium", "focus", "Artwork leads the reveal"),
  animation("GOLDEN_SWEEP", "Golden Sweep", "Premium", "golden", "Warm highlight sweep"),
  animation("LIQUID_REVEAL", "Liquid Reveal", "Dynamic", "liquid", "Fluid one-time reveal"),
  animation("DYNAMIC", "Dynamic", "Dynamic", "dynamic", "Energetic one-time entrance"),
  // Legacy identifier retained for existing campaigns.
  animation("CINEMATIC_ZOOM", "Cinematic Zoom", "Cinematic", "zoom", "Subtle background movement"),
  animation("OFFER_PULSE", "Offer Pulse", "Dynamic", "pulse", "One tasteful offer emphasis"),
];

export const STYLE_PRESETS = Object.freeze({
  CUSTOM: { label: "Custom" },
  ROYAL_FEAST: { label: "Royal Feast", titleTypographyPreset: "PLAYFAIR_DISPLAY_BOLD", subtitleTypographyPreset: "POPPINS_MEDIUM", ctaTypographyPreset: "MONTSERRAT_SEMIBOLD", animationPreset: "LUXURY_REVEAL", animationIntensity: "SUBTLE" },
  MODERN_GOURMET: { label: "Modern Gourmet", titleTypographyPreset: "MONTSERRAT_EXTRABOLD", subtitleTypographyPreset: "DM_SANS_MEDIUM", ctaTypographyPreset: "POPPINS_SEMIBOLD", animationPreset: "CINEMATIC_DRIFT", animationIntensity: "MEDIUM" },
  HOT_DEAL: { label: "Hot Deal", titleTypographyPreset: "BEBAS_NEUE_BOLD", subtitleTypographyPreset: "POPPINS_SEMIBOLD", ctaTypographyPreset: "MONTSERRAT_BOLD", animationPreset: "DYNAMIC", animationIntensity: "MEDIUM" },
  FESTIVE_GLOW: { label: "Festive Glow", titleTypographyPreset: "CORMORANT_GARAMOND_BOLD", subtitleTypographyPreset: "LORA_MEDIUM", ctaTypographyPreset: "POPPINS_SEMIBOLD", animationPreset: "GOLDEN_SWEEP", animationIntensity: "SUBTLE" },
  FRESH_DELICIOUS: { label: "Fresh & Delicious", titleTypographyPreset: "POPPINS_BOLD", subtitleTypographyPreset: "NUNITO_SANS_MEDIUM", ctaTypographyPreset: "MONTSERRAT_SEMIBOLD", animationPreset: "PREMIUM_REVEAL", animationIntensity: "SUBTLE" },
  GRAND_CELEBRATION: { label: "Grand Celebration", titleTypographyPreset: "PLAYFAIR_DISPLAY_BOLD", subtitleTypographyPreset: "LORA_REGULAR", ctaTypographyPreset: "MONTSERRAT_BOLD", animationPreset: "SPOTLIGHT_REVEAL", animationIntensity: "MEDIUM" },
  STREET_FOOD: { label: "Street Food", titleTypographyPreset: "BEBAS_NEUE_BOLD", subtitleTypographyPreset: "DM_SANS_BOLD", ctaTypographyPreset: "POPPINS_BOLD", animationPreset: "SLIDE_UP", animationIntensity: "MEDIUM" },
  NEW_ARRIVAL: { label: "New Arrival", titleTypographyPreset: "MONTSERRAT_EXTRABOLD", subtitleTypographyPreset: "DM_SANS_MEDIUM", ctaTypographyPreset: "POPPINS_BOLD", animationPreset: "MASK_REVEAL", animationIntensity: "MEDIUM" },
  MIDNIGHT_CRAVINGS: { label: "Midnight Cravings", titleTypographyPreset: "PLAYFAIR_DISPLAY_BOLD", subtitleTypographyPreset: "DM_SANS_MEDIUM", ctaTypographyPreset: "MONTSERRAT_SEMIBOLD", animationPreset: "CINEMATIC_DRIFT", animationIntensity: "SUBTLE" },
  FAMILY_FEAST: { label: "Family Feast", titleTypographyPreset: "NUNITO_SANS_EXTRABOLD", subtitleTypographyPreset: "POPPINS_MEDIUM", ctaTypographyPreset: "NUNITO_SANS_BOLD", animationPreset: "FLOATING_CONTENT", animationIntensity: "MEDIUM" },
  WEEKEND_VIBES: { label: "Weekend Vibes", titleTypographyPreset: "MONTSERRAT_BOLD", subtitleTypographyPreset: "POPPINS_MEDIUM", ctaTypographyPreset: "POPPINS_BOLD", animationPreset: "PARALLAX_DEPTH", animationIntensity: "MEDIUM" },
  CHEFS_SPECIAL: { label: "Chef's Special", titleTypographyPreset: "CORMORANT_GARAMOND_BOLD", subtitleTypographyPreset: "LORA_MEDIUM", ctaTypographyPreset: "MONTSERRAT_SEMIBOLD", animationPreset: "FOOD_FOCUS", animationIntensity: "SUBTLE" },
  FLASH_DROP: { label: "Flash Drop", titleTypographyPreset: "BEBAS_NEUE_BOLD", subtitleTypographyPreset: "MONTSERRAT_SEMIBOLD", ctaTypographyPreset: "MONTSERRAT_EXTRABOLD", animationPreset: "STAGGERED_REVEAL", animationIntensity: "BOLD" },
  ELEGANT_MOMENTS: { label: "Elegant Moments", titleTypographyPreset: "CORMORANT_GARAMOND_SEMIBOLD", subtitleTypographyPreset: "DM_SANS_REGULAR", ctaTypographyPreset: "POPPINS_SEMIBOLD", animationPreset: "GLASS_REVEAL", animationIntensity: "SUBTLE" },
  BRO_AND_BRO_SIGNATURE: { label: "Bro & Bro Signature", titleTypographyPreset: "PLAYFAIR_DISPLAY_BOLD", subtitleTypographyPreset: "POPPINS_MEDIUM", ctaTypographyPreset: "MONTSERRAT_BOLD", animationPreset: "LUXURY_REVEAL", animationIntensity: "SUBTLE" },
});
Object.values(STYLE_PRESETS).forEach(Object.freeze);

export function getTypographyPreset(value) {
  return TYPOGRAPHY_PRESETS[value] ?? DEFAULT_TYPOGRAPHY;
}

export function getAnimationPreset(value) {
  return ANIMATION_OPTIONS.some((option) => option.value === value) ? value : "NONE";
}

export function getAnimationOption(value) {
  return ANIMATION_OPTIONS.find((option) => option.value === getAnimationPreset(value)) ?? ANIMATION_OPTIONS[0];
}

export function getAnimationLabel(value) {
  return getAnimationOption(value).label;
}

export function getPlacementLabel(value) {
  return PLACEMENT_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getCampaignImage(campaign, mode = "desktop") {
  if (mode === "mobile") return campaign?.mobileImageUrl || campaign?.imageUrl || null;
  return campaign?.imageUrl || campaign?.mobileImageUrl || null;
}

export function getEffectiveCampaignStyle(campaign = {}) {
  const preset = STYLE_PRESETS[campaign.stylePreset];
  const fallback = {
    titleTypographyPreset: campaign.titleTypographyPreset ?? null,
    subtitleTypographyPreset: campaign.subtitleTypographyPreset ?? null,
    ctaTypographyPreset: campaign.ctaTypographyPreset ?? null,
    animationPreset: campaign.animationPreset ?? "NONE",
    animationIntensity: campaign.animationIntensity ?? "MEDIUM",
  };
  if (!preset || campaign.stylePreset === "CUSTOM") return fallback;
  const explicit = {
    titleTypographyPreset: campaign.titleTypographyPreset,
    subtitleTypographyPreset: campaign.subtitleTypographyPreset,
    ctaTypographyPreset: campaign.ctaTypographyPreset,
    animationPreset: campaign.animationPreset,
    animationIntensity: campaign.animationIntensity,
  };
  return {
    ...Object.fromEntries(
      Object.entries(preset).filter(([key]) => key !== "label"),
    ),
    ...Object.fromEntries(
      Object.entries(explicit).filter(([, value]) => value != null),
    ),
  };
}

export function getCampaignAnimationConfig({
  animationPreset,
  animationIntensity = "MEDIUM",
  isActive = true,
  reducedMotion = false,
  placement = "HERO",
} = {}) {
  const option = getAnimationOption(animationPreset);
  const intensity = ANIMATION_INTENSITIES.some((item) => item.value === animationIntensity)
    ? animationIntensity
    : "MEDIUM";
  return {
    ...option,
    intensity,
    placement,
    isActive,
    reducedMotion,
    enabled: isActive && !reducedMotion && option.value !== "NONE",
    effectClass: isActive && option.effect !== "none" ? `campaign-effect-${option.effect}` : "",
  };
}
