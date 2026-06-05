import { cn } from "@/lib/utils";
import FeaturedSegmentHeader from "./FeaturedSegmentHeader";
import FeaturedSegmentCarousel from "./FeaturedSegmentCarousel";
import { segmentVariants } from "./segmentVariants";

/**
 * FeaturedSegment
 *
 * Shelf-card layout. Each segment is its own curated container —
 * subtle #FAFAFA background, rounded corners, hairline border, and a
 * 3 px left accent stripe drawn from the variant colour so every
 * "chapter" has a distinct visual identity.
 *
 * Visual ratio target: 15% header / 85% products.
 */
export default function FeaturedSegment({
  variant = "generic",
  title,
  subtitle,
  badge,
  icon,
  action,
  items = [],
  emptyNode,
  hero = false,
  itemProps = {},
  className,
}) {
  const v = segmentVariants[variant] ?? segmentVariants.generic;

  return (
    <div
      className={cn("flex flex-col gap-2 rounded-2xl p-3", className)}
      style={{
        background: "#FAFAFA",
        border: "1px solid rgba(0,0,0,0.06)",
        borderLeft: `3px solid ${v.accentHex}`,
      }}
    >
      <FeaturedSegmentHeader
        variant={variant}
        title={title}
        subtitle={subtitle}
        badge={badge}
        icon={icon}
        action={action}
      />
      <FeaturedSegmentCarousel items={items} emptyNode={emptyNode} hero={hero} itemProps={itemProps} />
    </div>
  );
}


