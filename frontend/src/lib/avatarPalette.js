// Deterministic fallback-avatar system.
//
// When a user has no uploaded profile photo we still want a polished,
// modern-SaaS-style avatar rather than a plain initials circle or a flat
// generic silhouette icon. This derives a warm on-brand color pair PLUS a
// simple illustrated "bust" hairstyle variant from a stable hash of the
// user's id/email/username, so the *same* user always renders with the
// *same* avatar everywhere (sidebar, profile, user management, etc.)
// without persisting anything or inferring gender/identity from their name.
const AVATAR_PALETTE = [
  { bg: "#B88746", face: "#FFF3DF" }, // warm gold
  { bg: "#8C6E54", face: "#FBEFE3" }, // taupe
  { bg: "#A6684B", face: "#FFEFE1" }, // terracotta
  { bg: "#6E7B6B", face: "#F4F1E8" }, // sage
  { bg: "#5B6B7A", face: "#EFF3F5" }, // slate blue
  { bg: "#946B8C", face: "#F6EEF4" }, // muted plum
];

// A handful of neutral, gender-agnostic hairstyle silhouettes (bald / short
// cap / side-swept / rounded-full) used purely as an abstract illustration
// detail — never intended to signal gender.
export const AVATAR_HAIR_VARIANTS = 4;

function hashSeed(seed) {
  const value = String(seed ?? "");
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function darken(hex, amount) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (num & 0xff) * (1 - amount));
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

/**
 * Returns a deterministic { bg, face, hair, variant } avatar spec for a
 * given stable seed (user id, email, or username). Same seed always yields
 * the same result.
 */
export function getAvatarSpec(seed) {
  const hash = hashSeed(seed);
  const { bg, face } = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  const variant = Math.floor(hash / AVATAR_PALETTE.length) % AVATAR_HAIR_VARIANTS;
  return { bg, face, hair: darken(bg, 0.35), variant };
}

/** @deprecated use getAvatarSpec — kept for any existing color-only callers. */
export function getAvatarColors(seed) {
  const { bg, face } = getAvatarSpec(seed);
  return { bg, fg: face };
}

