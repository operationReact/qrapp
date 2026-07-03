/**
 * Segment variant tokens.
 *
 * Design language: premium café / food app.
 * Light, warm, typography-led. No dark blocks. No bright gradients.
 * Think: Sweetgreen, CAVA, Starbucks Reserve, Erewhon.
 *
 * headerBg      — very soft warm gradient for the label card
 * accentHex     — 3px left-border accent + badge/icon tint
 * titleColor    — near-black, high contrast
 * subtitleColor — muted warm grey
 * badgeBg       — barely-there tinted pill
 * badgeColor    — accent-tinted text
 * badgeBorder   — hairline accent border
 * emoji         — fallback icon
 */
export const segmentVariants = {
  preorder: {
    // Cool off-white with indigo undertone — reserved, exclusive
    headerBg: "linear-gradient(90deg, #f8f8fe 0%, #f0f0fc 100%)",
    accentHex: "#4f46e5",          // indigo — calm, pre-order exclusive
    titleColor: "#111827",
    subtitleColor: "#6B7280",
    badgeBg: "rgba(79,70,229,0.08)",
    badgeColor: "#4338ca",
    badgeBorder: "rgba(79,70,229,0.20)",
    emoji: "🔥",
  },
  signature: {
    // Warm off-white — luxury, craft
    headerBg: "linear-gradient(90deg, #fbfaf8 0%, #f4ede0 100%)",
    accentHex: "#8b6b3d",          // muted cognac gold
    titleColor: "#111827",
    subtitleColor: "#6B7280",
    badgeBg: "rgba(139,107,61,0.10)",
    badgeColor: "#7a5c2e",
    badgeBorder: "rgba(139,107,61,0.22)",
    emoji: "👑",
  },
  healthy: {
    // Clean pale green — fresh, natural
    headerBg: "linear-gradient(90deg, #f8fbf8 0%, #edf5ee 100%)",
    accentHex: "#5d8f67",          // forest sage
    titleColor: "#111827",
    subtitleColor: "#6B7280",
    badgeBg: "rgba(93,143,103,0.10)",
    badgeColor: "#3d7548",
    badgeBorder: "rgba(93,143,103,0.22)",
    emoji: "🥗",
  },
  generic: {
    headerBg: "linear-gradient(90deg, #f9f9f9 0%, #f3f3f3 100%)",
    accentHex: "#9CA3AF",
    titleColor: "#111827",
    subtitleColor: "#6B7280",
    badgeBg: "rgba(156,163,175,0.10)",
    badgeColor: "#6B7280",
    badgeBorder: "rgba(156,163,175,0.22)",
    emoji: "✨",
  },
};
