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

// Reusable ambient presentation presets for non-campaign sections. Kept apart from
// ANIMATION_OPTIONS because these loop continuously and are not persisted campaign values.
export const CELEBRATION_INTENSITIES = Object.freeze({
  SUBTLE: { confettiCount: 14, burstCount: 0, opacity: 0.7 },
  MEDIUM: { confettiCount: 22, burstCount: 5, opacity: 1 },
  BOLD: { confettiCount: 32, burstCount: 8, opacity: 1 },
});

export const CELEBRATION_PRESETS = Object.freeze({
  HALL_OF_HAPPINESS_CELEBRATION: Object.freeze({
    animations: Object.freeze(["CONFETTI", "WAVE_FLOW", "PARTY_ICONS"]),
    intensity: "BOLD",
    // Keeps text clear: waves hug the top/bottom edges, confetti and icons stay in edge bands.
    layout: "BANDED",
    confettiShapes: Object.freeze(["strip", "circle", "diamond", "star", "rect"]),
    waves: Object.freeze([
      { id: "primary", stops: ["#f43f5e", "#f59e0b", "#e11d48", "#f43f5e"], strokeWidth: 2.5, bottom: 70, height: 26, durationSeconds: 11, reverse: false, flip: false, opacity: 0.26 },
      { id: "complement", stops: ["#f59e0b", "#fb923c", "#ec4899", "#f59e0b"], strokeWidth: 2, bottom: 0, height: 26, durationSeconds: 14, reverse: true, flip: true, opacity: 0.22 },
    ]),
    confettiDurationRangeSeconds: Object.freeze([4, 8]),
    confettiOpacityRange: Object.freeze([0.45, 0.9]),
    burstCycleSeconds: 6,
    colors: Object.freeze(["#e11d48", "#f59e0b", "#fb7185", "#fbbf24", "#f97316", "#ec4899", "#fda4af"]),
    partyIcons: Object.freeze([
      { kind: "popper", left: 1.5, top: 0, size: 16, duration: 4.6, delay: -1.2, color: "#e11d48", opacity: 0.8 },
      { kind: "star", left: 95, top: 0, size: 12, duration: 3.8, delay: -2.4, color: "#f59e0b", opacity: 0.85 },
      { kind: "balloon", left: 72, top: 0, size: 14, duration: 5.6, delay: -0.6, color: "#ec4899", opacity: 0.7 },
      { kind: "burst", left: 38, top: 70, size: 11, duration: 3.4, delay: -1.8, color: "#fbbf24", opacity: 0.85 },
      { kind: "ribbon", left: 12, top: 72, size: 16, duration: 4.2, delay: -3.1, color: "#f97316", opacity: 0.65 },
    ]),
  }),
  HALL_OF_HAPPINESS_GALLERY_CELEBRATION: Object.freeze({
    animations: Object.freeze(["CONFETTI", "PARTY_ICONS"]),
    intensity: "BOLD",
    waves: Object.freeze([]),
    confettiDurationRangeSeconds: Object.freeze([4.5, 8.5]),
    confettiOpacityRange: Object.freeze([0.5, 0.95]),
    burstCycleSeconds: 6.5,
    colors: Object.freeze(["#e11d48", "#f59e0b", "#fb7185", "#fbbf24", "#f97316", "#ec4899", "#fda4af"]),
    partyIcons: Object.freeze([
      { kind: "popper", left: 80, top: 36, size: 24, duration: 4.6, delay: -1.2, color: "#e11d48", opacity: 0.8 },
      { kind: "star", left: 88, top: 8, size: 16, duration: 3.8, delay: -2.4, color: "#f59e0b", opacity: 0.85 },
      { kind: "balloon", left: 93, top: 52, size: 22, duration: 5.6, delay: -0.6, color: "#ec4899", opacity: 0.75 },
      { kind: "ribbon", left: 46, top: 84, size: 20, duration: 4.2, delay: -3.1, color: "#f97316", opacity: 0.7 },
      { kind: "burst", left: 24, top: 80, size: 16, duration: 3.4, delay: -1.8, color: "#fbbf24", opacity: 0.85 },
      { kind: "heart", left: 72, top: 82, size: 14, duration: 5, delay: -2.9, color: "#fb7185", opacity: 0.75 },
    ]),
  }),
});

export function getCelebrationPreset(name, intensityOverride) {
  const preset = CELEBRATION_PRESETS[name];
  if (!preset) return null;
  const intensity = CELEBRATION_INTENSITIES[intensityOverride ?? preset.intensity]
    ?? CELEBRATION_INTENSITIES.MEDIUM;
  return { ...preset, ...intensity };
}

const CONFETTI_SHAPES = ["rect", "strip", "circle", "diamond"];

// Deterministic so the same particles render on every mount and never reshuffle.
export function createConfettiParticles(preset, seed = 20240611) {
  const [minDuration, maxDuration] = preset.confettiDurationRangeSeconds;
  const [minOpacity, maxOpacity] = preset.confettiOpacityRange;
  const shapes = preset.confettiShapes ?? CONFETTI_SHAPES;
  const banded = preset.layout === "BANDED";
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  // Burst particles share one cycle and a tight delay window, so a small group
  // drifts further together every few seconds instead of everything looping evenly.
  const burstEvery = Math.max(1, Math.floor(preset.confettiCount / Math.max(preset.burstCount, 1)));
  return Array.from({ length: preset.confettiCount }, (_, index) => {
    const burst = preset.burstCount > 0 && index % burstEvery === 0
      && index / burstEvery < preset.burstCount;
    const duration = burst ? preset.burstCycleSeconds : minDuration + next() * (maxDuration - minDuration);
    return {
      id: index,
      burst,
      left: ((index + 0.15 + next() * 0.7) / preset.confettiCount) * 100,
      size: 5 + Math.round(next() * 5),
      shape: shapes[index % shapes.length],
      band: banded ? (index % 2 === 0 ? "top" : "bottom") : null,
      color: preset.colors[Math.floor(next() * preset.colors.length)],
      opacity: Number((minOpacity + next() * (maxOpacity - minOpacity)).toFixed(2)),
      duration,
      delay: burst ? -(next() * 0.9) : -next() * duration,
      drift: Math.round((next() - 0.5) * (burst ? 70 : 40)),
      rotation: Math.round(next() * 360),
      spin: Math.round((next() > 0.5 ? 1 : -1) * (180 + next() * 360)),
    };
  });
}

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
