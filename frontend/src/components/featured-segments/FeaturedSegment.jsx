import { cn } from "@/lib/utils";
import FeaturedSegmentHeader from "./FeaturedSegmentHeader";
import FeaturedSegmentCarousel from "./FeaturedSegmentCarousel";

/**
 * FeaturedSegment
 *
 * Netflix-row layout. No big colored container.
 * Header is a standalone pill. Products live below it, unrestricted.
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
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
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
