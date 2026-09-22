import { getAvatarSpec } from "@/lib/avatarPalette";

// Neutral, gender-agnostic hairstyle silhouettes drawn purely as an abstract
// illustration detail (bald / short cap / side-swept / rounded-full) — never
// intended to signal gender. Chosen deterministically per user in
// `getAvatarSpec`.
const HAIR_PATHS = [
  null, // bald / clean head
  "M28 40C28 27 38 18 50 18C62 18 72 27 72 40V42H28V40Z", // short cap
  "M27 41C27 26 37 17 50 17C61 17 70 24 72 34C64 30 55 29 48 33C40 37 33 38 27 43V41Z", // side-swept
  "M24 39C24 22 35 12 50 12C65 12 76 22 76 39C76 41 75.7 43 75.2 45C71 36 61 30 50 30C39 30 29 36 24.8 45C24.3 43 24 41 24 39Z", // rounded full
];

/**
 * A deterministic, illustrated "bust" avatar used as the fallback whenever a
 * user has no uploaded profile photo. Same seed (user id/email/username)
 * always renders identically — same warm accent color and same neutral
 * hairstyle silhouette — so a user's avatar stays consistent everywhere.
 */
export function GeneratedAvatar({ seed, className, size = 48 }) {
  const { bg, face, hair, variant } = getAvatarSpec(seed);
  const hairPath = HAIR_PATHS[variant];
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="User avatar"
    >
      <circle cx="50" cy="50" r="50" fill={bg} />
      {/* shoulders / bust */}
      <path d="M14 100C14 78 30 66 50 66C70 66 86 78 86 100Z" fill={face} />
      {/* head */}
      <circle cx="50" cy="42" r="20" fill={face} />
      {/* subtle top highlight for a touch of illustrated polish */}
      <circle cx="50" cy="50" r="50" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      {hairPath && <path d={hairPath} fill={hair} />}
    </svg>
  );
}
