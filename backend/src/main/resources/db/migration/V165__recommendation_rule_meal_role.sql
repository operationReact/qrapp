-- Complete Your Meal now reads its drink / side / dessert companions from cart rules.
-- A rule with meal_role set is a meal companion for its trigger item. It is used by
-- Complete Your Meal only, not by generic cart suggestions.
-- Existing item_pairing rows are copied into rules, then the old table is dropped.

ALTER TABLE recommendation_rule
    ADD COLUMN meal_role VARCHAR(20);

ALTER TABLE recommendation_rule
    ADD CONSTRAINT chk_recommendation_rule_meal_role CHECK (
        meal_role IS NULL OR meal_role IN ('DRINK', 'SIDE', 'DESSERT', 'ADDON')
    );

INSERT INTO recommendation_rule (
    location_id, name, trigger_type, trigger_item_id, target_item_id,
    reward_type, reward_value, priority, is_active, meal_role,
    created_by, updated_by, created_at, updated_at
)
SELECT
    src.location_id,
    LEFT('Meal: ' || src.name || ' -> ' || tgt.name, 150),
    'ITEM_IN_CART',
    ip.source_item_id,
    ip.target_item_id,
    'FIXED_DISCOUNT',
    0,
    ip.priority,
    ip.is_active,
    ip.pairing_role,
    ip.created_by,
    ip.created_by,
    ip.created_at,
    ip.updated_at
FROM item_pairing ip
JOIN menu_item src ON src.id = ip.source_item_id
JOIN menu_item tgt ON tgt.id = ip.target_item_id
WHERE src.location_id = tgt.location_id;

DROP TABLE item_pairing;
