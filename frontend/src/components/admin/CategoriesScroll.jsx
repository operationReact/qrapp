import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Carousel, CarouselContent, CarouselItem } from "../ui/carousel";

// ── Category display helpers ──────────────────────────────────────────────────

const EMOJI_RULES = [
  [/signature|premium|featured|special/i, "⭐"],
  [/breakfast|morning|brunch/i,           "🍳"],
  [/healthy|salad|bowl|fresh/i,           "🥗"],
  [/biryani/i,                            "🍛"],
  [/rice/i,                               "🍚"],
  [/beverage|drink|juice|coffee|tea|chai/i, "🥤"],
  [/dessert|sweet|cake|pastry/i,          "🍰"],
  [/snack|starter|appetizer/i,            "🍿"],
  [/chicken|poultry/i,                    "🍗"],
  [/pizza/i,                              "🍕"],
  [/burger|sandwich|wrap/i,               "🥪"],
  [/combo|meal|thali/i,                   "🎯"],
  [/soup/i,                               "🍲"],
  [/paneer|veg/i,                         "🧀"],
  [/mutton|lamb/i,                        "🥩"],
  [/seafood|fish|prawn/i,                 "🦐"],
  [/pasta|noodle/i,                       "🍜"],
];

function getCategoryEmoji(name) {
  for (const [pattern, emoji] of EMOJI_RULES) {
    if (pattern.test(name)) return emoji;
  }
  return null;
}

function formatCategoryLabel(name) {
  if (!name) return name;
  // Strip common brand prefix like "BB"
  let clean = name.replace(/^BB/i, "");
  // Split CamelCase into words
  clean = clean.replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  // Remove trailing generic noise words
  clean = clean.replace(/\s*(Products?|Items?|Selections?|Range)\s*$/i, "").trim();
  // Collapse extra whitespace
  clean = clean.replace(/\s+/g, " ").trim();
  return clean || name;
}

export default function CategoriesScroll({
  categories = [],
  value = "ALL",
  onChange,
  counts = {},
}) {
  const items = [
    { key: "ALL", label: "All", count: counts.ALL },
    ...categories.map((c) => ({
      key: c,
      label: formatCategoryLabel(c),
      emoji: getCategoryEmoji(c),
      count: counts[c],
    })),
  ];

  return (
    <Carousel opts={{ dragFree: true }} className="grid">
      <CarouselContent className="-ml-2">
        {items.map((item) => {
          const isActive = value === item.key;
          return (
            <CarouselItem key={item.key} className="basis-auto pl-2">
              <Button
                type="button"
                onClick={() => onChange(item.key)}
                variant={isActive ? "branded-secondary" : "secondary"}
                className="gap-1 text-xs"
              >
                {item.emoji && <span>{item.emoji}</span>}
                <span>{item.label}</span>
                {isActive && typeof item.count === "number" && (
                  <Badge className="bg-primary text-primary-foreground ml-0.5">
                    {item.count}
                  </Badge>
                )}
              </Button>
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );
}
