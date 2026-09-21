export const FALLBACK_ICON_KEY = "generic-food";
export const FALLBACK_ICON_SRC = "/category-icons/generic-food.svg";

const ICON_IMAGE_MAP = {
  all: "/category-icons/all.svg",
  breakfast: "/category-icons/breakfast.svg",
  lunch: "/category-icons/lunch.svg",
  dinner: "/category-icons/dinner.svg",
  biryani: "/category-icons/biryani.svg",
  pizza: "/category-icons/pizza.svg",
  burger: "/category-icons/burger.svg",
  sandwich: "/category-icons/sandwich.svg",
  wraps: "/category-icons/wraps.svg",
  chinese: "/category-icons/chinese.svg",
  noodles: "/category-icons/noodles.svg",
  dessert: "/category-icons/dessert.svg",
  icecream: "/category-icons/icecream.svg",
  beverage: "/category-icons/beverage.svg",
  coffee: "/category-icons/coffee.svg",
  tea: "/category-icons/tea.svg",
  juice: "/category-icons/juice.svg",
  milkshake: "/category-icons/milkshake.svg",
  snacks: "/category-icons/snacks.svg",
  "street-food": "/category-icons/street-food.svg",
  "south-indian": "/category-icons/south-indian.svg",
  "north-indian": "/category-icons/north-indian.svg",
  healthy: "/category-icons/healthy.svg",
  salad: "/category-icons/salad.svg",
  pasta: "/category-icons/pasta.svg",
  bakery: "/category-icons/bakery.svg",
  mexican: "/category-icons/mexican.svg",
  meal: "/category-icons/meal.svg",
  [FALLBACK_ICON_KEY]: FALLBACK_ICON_SRC,
};

const EXACT_MATCHES = new Map([
  ["all", "all"],
  ["breakfast", "breakfast"],
  ["lunch", "lunch"],
  ["dinner", "dinner"],
  ["biryani", "biryani"],
  ["pizza", "pizza"],
  ["burger", "burger"],
  ["sandwich", "sandwich"],
  ["sandwiches", "sandwich"],
  ["chinese", "chinese"],
  ["noodles", "noodles"],
  ["dessert", "dessert"],
  ["desserts", "dessert"],
  ["ice cream", "icecream"],
  ["beverages", "beverage"],
  ["beverage", "beverage"],
  ["coffee", "coffee"],
  ["tea", "tea"],
  ["juices", "juice"],
  ["juice", "juice"],
  ["snacks", "snacks"],
  ["healthy", "healthy"],
  ["salads", "salad"],
  ["salad", "salad"],
  ["pasta", "pasta"],
  ["bakery", "bakery"],
  ["mexican", "mexican"],
  ["wraps", "wraps"],
  ["milkshakes", "milkshake"],
  ["street food", "street-food"],
]);

const CATEGORY_RULES = [
  {
    key: "biryani",
    phrases: ["chicken biryani", "veg biryani", "mutton biryani"],
    keywords: ["biryani", "pulao", "pilaf", "rice"],
  },
  {
    key: "breakfast",
    phrases: ["breakfast specials"],
    keywords: ["breakfast", "morning", "brunch"],
  },
  { key: "lunch", keywords: ["lunch", "midday"] },
  { key: "dinner", keywords: ["dinner", "supper", "night meal"] },
  {
    key: "pizza",
    phrases: ["pizza and pasta", "pizza pasta"],
    keywords: ["pizza", "margherita", "pepperoni"],
  },
  { key: "burger", keywords: ["burger", "hamburger", "cheeseburger", "slider"] },
  { key: "wraps", keywords: ["wrap", "frankie", "roll", "shawarma", "kathi"] },
  { key: "sandwich", keywords: ["sandwich", "toastie", "sub", "panini"] },
  { key: "chinese", phrases: ["chinese food"], keywords: ["chinese", "manchurian", "szechuan", "asian"] },
  { key: "noodles", keywords: ["noodle", "ramen", "hakka", "chowmein", "chow mein"] },
  { key: "pasta", keywords: ["pasta", "spaghetti", "penne", "macaroni", "alfredo"] },
  { key: "dessert", keywords: ["dessert", "sweet", "brownie", "pastry", "cake", "halwa"] },
  { key: "icecream", keywords: ["ice cream", "icecream", "gelato", "kulfi", "sundae"] },
  { key: "coffee", keywords: ["coffee", "espresso", "cappuccino", "latte", "mocha"] },
  { key: "tea", keywords: ["tea", "chai", "green tea", "black tea"] },
  { key: "milkshake", keywords: ["milkshake", "shake", "smoothie"] },
  { key: "juice", keywords: ["juice", "juices", "fresh fruit", "mocktail"] },
  { key: "beverage", keywords: ["beverage", "drink", "drinks", "soda", "cooler"] },
  { key: "snacks", keywords: ["snack", "snacks", "starter", "chaat", "finger food"] },
  { key: "street-food", phrases: ["street food"], keywords: ["street", "chaat", "pav", "golgappa"] },
  { key: "south-indian", keywords: ["south indian", "dosa", "idli", "vada", "uttapam"] },
  { key: "north-indian", keywords: ["north indian", "curry", "tandoori", "paneer", "thali"] },
  { key: "salad", keywords: ["salad", "salads", "greens"] },
  { key: "healthy", keywords: ["healthy", "health", "diet", "protein", "bowl", "bowls"] },
  { key: "bakery", keywords: ["bakery", "bread", "muffin", "croissant", "bun"] },
  { key: "mexican", keywords: ["mexican", "taco", "burrito", "quesadilla", "nachos"] },
  {
    key: "meal",
    phrases: ["chef special", "chef specials", "chef s special", "chef s specials", "special combo", "special combos"],
    keywords: ["combo", "combos", "meal", "platter"],
  },
];

function isUrlLike(value) {
  return /^https?:\/\//i.test(value) || value.startsWith("/") || value.startsWith("data:image/");
}

function singularize(token) {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
}

export function normalizeCategoryName(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTokenSet(normalized) {
  const rawTokens = normalized.split(" ").filter(Boolean);
  const withSingular = rawTokens.flatMap((token) => [token, singularize(token)]);
  return new Set(withSingular);
}

export function resolveCategoryIconKey(categoryName) {
  const normalized = normalizeCategoryName(categoryName);
  if (!normalized) return FALLBACK_ICON_KEY;

  if (EXACT_MATCHES.has(normalized)) return EXACT_MATCHES.get(normalized);

  const tokens = toTokenSet(normalized);
  for (const rule of CATEGORY_RULES) {
    if (rule.phrases?.some((phrase) => normalized.includes(phrase))) return rule.key;
    if (rule.keywords?.some((keyword) => tokens.has(keyword) || normalized.includes(keyword))) return rule.key;
  }

  return FALLBACK_ICON_KEY;
}

export function getCategoryDisplayName(category) {
  if (typeof category === "string") return category;
  if (category && typeof category === "object") return category.displayName || category.name || category.title || "";
  return "";
}

function resolveExplicitOverride(category) {
  if (!category || typeof category !== "object") return null;
  const raw = category.iconUrl || category.iconImageUrl || category.icon || category.iconName || category.iconKey || category.thumbnailUrl;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = raw.trim();
  if (isUrlLike(value)) return { kind: "image", src: value };

  const normalizedKey = normalizeCategoryName(value).replace(/\s+/g, "-");
  if (ICON_IMAGE_MAP[normalizedKey]) return { kind: "image", src: ICON_IMAGE_MAP[normalizedKey], key: normalizedKey };
  return null;
}

export function getCategoryIconSrc(key) {
  return ICON_IMAGE_MAP[key] || FALLBACK_ICON_SRC;
}

export function resolveCategoryIcon(category) {
  const categoryName = getCategoryDisplayName(category);
  const semanticKey = resolveCategoryIconKey(categoryName);
  const override = resolveExplicitOverride(category);

  if (override?.kind === "image") {
    return {
      kind: "image",
      src: override.src,
      key: override.key || semanticKey || FALLBACK_ICON_KEY,
      fallbackSrc: getCategoryIconSrc(semanticKey),
    };
  }

  const key = semanticKey || FALLBACK_ICON_KEY;
  return {
    kind: "image",
    key,
    src: getCategoryIconSrc(key),
    fallbackSrc: FALLBACK_ICON_SRC,
  };
}

