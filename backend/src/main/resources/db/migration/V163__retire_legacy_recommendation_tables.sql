-- Phase 4: retire the old recommendation tables. Every active row is carried into
-- recommendation_rule first, so customer suggestions keep working after the drop.

-- Manual item→item pairs become ITEM_IN_CART rules with no discount.
-- Lower display_order keeps its place at the top via a higher priority.
INSERT INTO recommendation_rule (
    location_id, name, trigger_type, trigger_item_id,
    target_item_id, reward_type, reward_value, priority,
    is_active, created_by, updated_by, created_at, updated_at
)
SELECT
    src.location_id,
    LEFT('Pair: ' || src.name || ' -> ' || tgt.name, 150),
    'ITEM_IN_CART',
    r.source_item_id,
    r.target_item_id,
    'FIXED_DISCOUNT',
    0,
    2000 - r.display_order,
    r.is_active,
    r.created_by,
    r.updated_by,
    r.created_at,
    r.updated_at
FROM rec_item_recommendation r
JOIN menu_item src ON src.id = r.source_item_id
JOIN menu_item tgt ON tgt.id = r.target_item_id
WHERE src.location_id = tgt.location_id;

-- Category pairings expand to one ITEM rule per sellable item in the target category.
INSERT INTO recommendation_rule (
    location_id, name, trigger_type, trigger_category_id,
    target_item_id, reward_type, reward_value, priority,
    is_active, created_by, created_at, updated_at
)
SELECT
    src.location_id,
    LEFT('Category: ' || src.name || ' -> ' || m.name, 150),
    'CATEGORY_IN_CART',
    p.source_cat_id,
    m.id,
    'FIXED_DISCOUNT',
    0,
    -1000 - p.display_order,
    p.is_active,
    p.created_by,
    p.created_at,
    p.created_at
FROM rec_category_pairing p
JOIN category src ON src.id = p.source_cat_id
JOIN category tgt ON tgt.id = p.target_cat_id
JOIN menu_item m ON m.category_id = tgt.id
    AND m.location_id = src.location_id
    AND m.available = TRUE
    AND m.is_hidden = FALSE
    AND m.is_deleted = FALSE;

DROP TABLE rec_upsell_rule_target;
DROP TABLE rec_upsell_rule;
DROP TABLE rec_category_pairing;
DROP TABLE rec_item_recommendation;
