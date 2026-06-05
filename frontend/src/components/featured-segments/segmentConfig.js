/**
 * Quick Collections config.
 *
 * Each collection drives one visual card in the horizontal strip and its
 * corresponding product rail. Time-sensitive fields (badge, subtitle,
 * action, itemProps) are injected at runtime in index.jsx.
 *
 * gradient   — CSS gradient for the card background
 * valueProp  — short value-prop label shown on the card (white pill)
 */
export const QUICK_COLLECTIONS = [
  {
    id: "preorder",
    emoji: "🔥",
    label: "Pre-Order",
    title: "Pre-Order Specials",
    subtitle: "Reserve tomorrow's favorites today",
    valueProp: "Reserve for Tomorrow",
    gradient: "linear-gradient(135deg, #4338ca 0%, #7c3aed 100%)",
    badge: "Limited Time",
    accentHex: "#4f46e5",
    badgeBg: "rgba(79,70,229,0.08)",
    badgeColor: "#4338ca",
    badgeBorder: "rgba(79,70,229,0.20)",
  },
  {
    id: "budget",
    emoji: "💰",
    label: "Under ₹99",
    title: "Budget Bites",
    subtitle: "Great food, easy on the pocket",
    valueProp: "Best Value",
    gradient: "linear-gradient(135deg, #16a34a 0%, #059669 100%)",
    badge: "Under ₹99",
    accentHex: "#16a34a",
    badgeBg: "rgba(22,163,74,0.08)",
    badgeColor: "#15803d",
    badgeBorder: "rgba(22,163,74,0.20)",
  },
  {
    id: "healthy",
    emoji: "🥗",
    label: "Healthy",
    title: "Healthy Choices",
    subtitle: "Balanced meals, fresh ingredients, nourishing bowls",
    valueProp: "Fresh & Clean",
    gradient: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
    badge: "Wholesome",
    accentHex: "#0d9488",
    badgeBg: "rgba(13,148,136,0.10)",
    badgeColor: "#0f766e",
    badgeBorder: "rgba(13,148,136,0.22)",
  },
  {
    id: "signature",
    emoji: "👑",
    label: "Signature",
    title: "BB Signature Products",
    subtitle: "Premium house specialties crafted by our chefs",
    valueProp: "Chef's Picks",
    gradient: "linear-gradient(135deg, #92400e 0%, #b45309 100%)",
    badge: "House Special",
    accentHex: "#8b6b3d",
    badgeBg: "rgba(139,107,61,0.10)",
    badgeColor: "#7a5c2e",
    badgeBorder: "rgba(139,107,61,0.22)",
  },
];
