/**
 * Recommendation Health Analysis
 *
 * Scores a source→target item pairing across 5 factors and maps the result
 * to a human-readable tier label.  No raw score is ever shown to the user.
 *
 * ── Factors ────────────────────────────────────────────────────────────────
 *  1. Explicit Item Pairing exists           +40
 *  2. Meal Type compatibility                +30 match / +15 neutral / +0 mismatch
 *  3. Cuisine Type compatibility             +20 match / +10 neutral / +0 mismatch
 *  4. Category Pairing configured            +5
 *  5. Companion Combo Role on target         +5
 *                                     max = 100
 *
 * ── Tiers ──────────────────────────────────────────────────────────────────
 *  90+   → Excellent Match
 *  70–89 → Good Match
 *  50–69 → Fair Match
 *  < 50  → Needs Review
 */

// ── Tier definitions ─────────────────────────────────────────────────────────

export const HEALTH_TIERS = [
  {
    min: 90,
    label: "Excellent Match",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot:   "bg-emerald-500",
  },
  {
    min: 70,
    label: "Good Match",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    dot:   "bg-sky-500",
  },
  {
    min: 50,
    label: "Fair Match",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot:   "bg-amber-400",
  },
  {
    min: 0,
    label: "Needs Review",
    badge: "bg-red-50 text-red-600 border-red-200",
    dot:   "bg-red-400",
  },
];

// Combo roles that make natural companions (anything except "Primary")
const COMPANION_ROLES = new Set(["Drink", "Dessert", "Addon", "Accompaniment"]);

// ── Core computation ──────────────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object|null}   params.sourceClassif       – { comboRole, mealTypes, cuisineTypes }
 * @param {object|null}   params.targetClassif       – same shape
 * @param {object[]}      params.categoryPairings    – [{ sourceCategoryId, targetCategoryId, isActive }]
 * @param {number|null}   params.sourceCategoryId
 * @param {number|null}   params.targetCategoryId
 * @param {boolean}       params.hasExplicitPairing  – is it explicitly configured?
 *
 * @returns {{ label: string, badge: string, dot: string, reasons: {ok:boolean, text:string}[] }}
 */
export function computePairingHealth({
  sourceClassif,
  targetClassif,
  categoryPairings   = [],
  sourceCategoryId   = null,
  targetCategoryId   = null,
  hasExplicitPairing = false,
}) {
  let score = 0;
  const reasons = [];

  // ── Factor 1: Explicit Item Pairing ──────────────────────────────────────
  if (hasExplicitPairing) {
    score += 40;
    reasons.push({ ok: true,  text: "Explicit Pairing Exists" });
  } else {
    reasons.push({ ok: false, text: "No Pairing Configured" });
  }

  // ── Factor 2: Meal Type Compatibility ────────────────────────────────────
  const srcMeals = sourceClassif?.mealTypes ?? [];
  const tgtMeals = targetClassif?.mealTypes ?? [];

  if (srcMeals.length === 0 || tgtMeals.length === 0) {
    score += 15; // neutral – unclassified, don't penalise
  } else {
    const srcMealIds  = new Set(srcMeals.map(m => m.id));
    const hasAnytime  = tgtMeals.some(m => m.name === "Anytime");
    const hasOverlap  = tgtMeals.some(m => srcMealIds.has(m.id));

    if (hasAnytime || hasOverlap) {
      score += 30;
      reasons.push({ ok: true,  text: "Same Meal Type" });
    } else {
      reasons.push({ ok: false, text: "Meal Type Mismatch" });
    }
  }

  // ── Factor 3: Cuisine Type Compatibility ─────────────────────────────────
  const srcCuisines = sourceClassif?.cuisineTypes ?? [];
  const tgtCuisines = targetClassif?.cuisineTypes ?? [];

  if (srcCuisines.length === 0 || tgtCuisines.length === 0) {
    score += 10; // neutral
  } else {
    const srcCuisineIds = new Set(srcCuisines.map(c => c.id));
    if (tgtCuisines.some(c => srcCuisineIds.has(c.id))) {
      score += 20;
      reasons.push({ ok: true,  text: "Same Cuisine" });
    } else {
      reasons.push({ ok: false, text: "Cuisine Mismatch" });
    }
  }

  // ── Factor 4: Category Pairing Match ─────────────────────────────────────
  if (sourceCategoryId && targetCategoryId) {
    const matched = categoryPairings.some(
      p => p.sourceCategoryId === sourceCategoryId &&
           p.targetCategoryId === targetCategoryId &&
           p.isActive,
    );
    if (matched) {
      score += 5;
      reasons.push({ ok: true, text: "Category Pairing Configured" });
    }
  }

  // ── Factor 5: Companion Combo Role ───────────────────────────────────────
  const targetRole = targetClassif?.comboRole?.name;
  if (targetRole && COMPANION_ROLES.has(targetRole)) {
    score += 5;
    reasons.push({ ok: true, text: "Compatible Role" });
  }

  // ── Map to tier ───────────────────────────────────────────────────────────
  score = Math.min(score, 100);
  const tier = HEALTH_TIERS.find(t => score >= t.min) ?? HEALTH_TIERS[HEALTH_TIERS.length - 1];

  return { label: tier.label, badge: tier.badge, dot: tier.dot, reasons };
}

