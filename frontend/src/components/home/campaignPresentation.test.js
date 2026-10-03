import test from "node:test";
import assert from "node:assert/strict";
import {
  ANIMATION_OPTIONS,
  PLACEMENT_OPTIONS,
  STYLE_PRESETS,
  createConfettiParticles,
  getCelebrationPreset,
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

test("Hall of Happiness celebration preset combines confetti and layered wave flow", () => {
  const preset = getCelebrationPreset("HALL_OF_HAPPINESS_CELEBRATION");
  assert.deepEqual([...preset.animations], ["CONFETTI", "WAVE_FLOW", "PARTY_ICONS"]);
  assert.equal(preset.intensity, "BOLD");
  assert.equal(getCelebrationPreset("UNKNOWN"), null);
  assert.equal(preset.waves.length, 2);
  assert.ok(preset.waves.every((wave) => wave.opacity <= 0.3 && wave.strokeWidth <= 3));
  assert.ok(preset.partyIcons.length >= 3 && preset.partyIcons.length <= 5);
  assert.equal(new Set(preset.waves.map((wave) => wave.durationSeconds)).size, 2);
  assert.ok(preset.waves.some((wave) => wave.reverse));
  assert.ok(preset.confettiCount >= 24 && preset.confettiCount <= 32);
});

test("confetti particles are deterministic, bounded and desynchronised", () => {
  const preset = getCelebrationPreset("HALL_OF_HAPPINESS_CELEBRATION");
  const first = createConfettiParticles(preset);
  assert.deepEqual(first, createConfettiParticles(preset));
  assert.equal(first.length, preset.confettiCount);
  for (const particle of first) {
    assert.ok(particle.left > 0 && particle.left < 100);
    assert.ok(particle.size >= 5 && particle.size <= 10);
    assert.ok(particle.duration >= 4 && particle.duration <= 8);
    assert.ok(particle.delay <= 0 && particle.delay >= -particle.duration);
    assert.ok(particle.opacity >= 0.45 && particle.opacity <= 0.9);
  }
  assert.deepEqual(
    [...new Set(first.map((particle) => particle.shape))].sort(),
    ["circle", "diamond", "rect", "star", "strip"],
  );
  assert.deepEqual([...new Set(first.map((particle) => particle.band))].sort(), ["bottom", "top"]);
  const bursts = first.filter((particle) => particle.burst);
  assert.equal(bursts.length, preset.burstCount);
  assert.ok(bursts.every((particle) => particle.duration === preset.burstCycleSeconds));
  assert.ok(new Set(first.filter((p) => !p.burst).map((p) => p.delay.toFixed(2))).size > 10);
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

test("gallery celebration preset combines confetti with party icons", () => {
  const preset = getCelebrationPreset("HALL_OF_HAPPINESS_GALLERY_CELEBRATION");
  assert.deepEqual([...preset.animations], ["CONFETTI", "PARTY_ICONS"]);
  assert.ok(preset.confettiCount >= 24 && preset.confettiCount <= 36);
  assert.ok(preset.partyIcons.length >= 3 && preset.partyIcons.length <= 6);
  const medium = getCelebrationPreset("HALL_OF_HAPPINESS_GALLERY_CELEBRATION", "MEDIUM");
  assert.ok(medium.confettiCount < preset.confettiCount);
});
