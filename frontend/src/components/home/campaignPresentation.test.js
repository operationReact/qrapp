import test from "node:test";
import assert from "node:assert/strict";
import {
  ANIMATION_OPTIONS,
  PLACEMENT_OPTIONS,
  STYLE_PRESETS,
  getCampaignAnimationConfig,
  getAnimationPreset,
  getCampaignImage,
  getEffectiveCampaignStyle,
  getTypographyPreset,
} from "./campaignPresentation.js";

test("missing presentation settings use backward-compatible defaults", () => {
  assert.equal(getTypographyPreset(undefined).family, "Instrument Sans");
  assert.equal(getAnimationPreset(undefined), "NONE");
});

test("unknown presentation settings fall back safely", () => {
  assert.equal(getTypographyPreset("UNKNOWN").family, "Instrument Sans");
  assert.equal(getAnimationPreset("UNKNOWN"), "NONE");
});

test("mobile campaign artwork falls back to desktop artwork", () => {
  assert.equal(getCampaignImage({ imageUrl: "desktop.jpg" }, "mobile"), "desktop.jpg");
  assert.equal(
    getCampaignImage({ imageUrl: "desktop.jpg", mobileImageUrl: "mobile.jpg" }, "mobile"),
    "mobile.jpg",
  );
});

test("placement and animation presets retain the supported values", () => {
  assert.deepEqual(
    PLACEMENT_OPTIONS.map((option) => option.value),
    ["HERO", "DISCOVERY", "PROMOTION"],
  );
  assert.equal(ANIMATION_OPTIONS.length, 21);
  assert.equal(Object.keys(STYLE_PRESETS).length, 16);
  assert.equal(getCampaignAnimationConfig({
    animationPreset: "LUXURY_REVEAL",
    animationIntensity: "BOLD",
    placement: "PROMOTION",
  }).intensity, "BOLD");
});

test("style presets resolve defaults and custom values override them", () => {
  const royal = getEffectiveCampaignStyle({ stylePreset: "ROYAL_FEAST" });
  assert.equal(royal.titleTypographyPreset, "PLAYFAIR_DISPLAY_BOLD");
  assert.equal(royal.animationPreset, "LUXURY_REVEAL");
  const custom = getEffectiveCampaignStyle({
    stylePreset: "ROYAL_FEAST",
    ctaTypographyPreset: "BEBAS_NEUE_BOLD",
  });
  assert.equal(custom.ctaTypographyPreset, "BEBAS_NEUE_BOLD");
  assert.equal(custom.titleTypographyPreset, "PLAYFAIR_DISPLAY_BOLD");
});
