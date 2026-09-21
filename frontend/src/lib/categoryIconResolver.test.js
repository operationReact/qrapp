import test from "node:test";
import assert from "node:assert/strict";
import {
  FALLBACK_ICON_KEY,
  resolveCategoryIcon,
  resolveCategoryIconKey,
} from "./categoryIconResolver.js";

const exactExpectations = {
  Breakfast: "breakfast",
  Lunch: "lunch",
  Biryani: "biryani",
  Pizza: "pizza",
  Burger: "burger",
  Sandwich: "sandwich",
  Chinese: "chinese",
  Noodles: "noodles",
  Desserts: "dessert",
  Beverages: "beverage",
  Coffee: "coffee",
  Tea: "tea",
  Juices: "juice",
  Salads: "salad",
  Pasta: "pasta",
  Bakery: "bakery",
  Healthy: "healthy",
};

const semanticExpectations = {
  "Breakfast Specials": "breakfast",
  "Chicken Biryani": "biryani",
  "Fresh Fruit Juices": "juice",
  "Chef's Specials": "meal",
  "Street Food": "street-food",
  Mexican: "mexican",
  Wraps: "wraps",
  Milkshakes: "milkshake",
  "Healthy Bowls": "healthy",
};

test("resolves primary category semantics", () => {
  for (const [name, expected] of Object.entries(exactExpectations)) {
    assert.equal(resolveCategoryIconKey(name), expected, name);
  }
});

test("resolves complex category phrases", () => {
  for (const [name, expected] of Object.entries(semanticExpectations)) {
    assert.equal(resolveCategoryIconKey(name), expected, name);
  }
});

test("unknown category always falls back to generic food icon", () => {
  assert.equal(resolveCategoryIconKey("Unknown Future Category"), FALLBACK_ICON_KEY);
});

test("icon resolver always returns a valid non-empty icon result", () => {
  const categories = [
    ...Object.keys(exactExpectations),
    ...Object.keys(semanticExpectations),
    "Unknown Future Category",
  ];

  for (const name of categories) {
    const resolved = resolveCategoryIcon(name);
    assert.ok(resolved);
    assert.notEqual(resolved, null);
    assert.notEqual(resolved, undefined);
    assert.ok(resolved.key);
    assert.equal(resolved.kind, "image");
    assert.ok(resolved.src);
  }
});

test("manual image override takes priority when configured", () => {
  const resolved = resolveCategoryIcon({
    name: "Breakfast",
    iconUrl: "/category-icons/custom-breakfast.svg",
  });
  assert.equal(resolved.kind, "image");
  assert.equal(resolved.src, "/category-icons/custom-breakfast.svg");
});

test("manual icon key override takes priority when configured", () => {
  const resolved = resolveCategoryIcon({
    name: "Breakfast",
    iconKey: "pizza",
  });
  assert.equal(resolved.kind, "image");
  assert.equal(resolved.key, "pizza");
  assert.ok(resolved.src.includes("pizza"));
});
