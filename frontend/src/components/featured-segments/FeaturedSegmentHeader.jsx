import { segmentVariants } from "./segmentVariants";

/**
 * FeaturedSegmentHeader
 *
 * Option C layout — accent strip card.
 * Target height: 56px (two-line) / 48px (title-only).
 *
 * Structure:
 *   3px left accent border
 *   Soft warm gradient background
 *   [emoji]  [Title / Subtitle]  [badge or action]
 *
 * Typography is the hero. The card is the context.
 * No dark blocks. No full-width banners. No SaaS vibes.
 */
export default function FeaturedSegmentHeader({
  variant = "generic",
  title,
  subtitle,
  badge,
  icon,
  action,
}) {
  const v = segmentVariants[variant] ?? segmentVariants.generic;

  return (
    <div
      className="flex items-center gap-2.5 rounded-2xl px-3.5 py-3 shadow-sm"
      style={{
        background: v.headerBg,
        borderLeft: `3px solid ${v.accentHex}`,
        border: `1px solid rgba(0,0,0,0.06)`,
        borderLeftWidth: "3px",
        borderLeftColor: v.accentHex,
      }}
    >
      {/* Accent-tinted emoji — small, not dominant */}
      <span className="flex-shrink-0 text-base leading-none">
        {icon ?? v.emoji}
      </span>

      {/* Title + subtitle stack — flex-1 so it owns the space */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="truncate text-[15px] font-bold leading-snug tracking-[-0.01em]"
          style={{ color: v.titleColor }}
        >
          {title}
        </span>
        {subtitle && (
          <span
            className="truncate text-[12px] font-medium leading-none"
            style={{ color: v.subtitleColor }}
          >
            {subtitle}
          </span>
        )}
      </div>

      {/* Right slot: action (countdown) or badge — never both */}
      {action ? (
        <div className="flex-shrink-0">{action}</div>
      ) : badge ? (
        <span
          className="flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none"
          style={{
            background: v.badgeBg,
            color: v.badgeColor,
            border: `1px solid ${v.badgeBorder}`,
          }}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}
