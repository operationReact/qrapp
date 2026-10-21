-- Phase 3: one table for cart recommendation rules.
-- Each row = "when the trigger matches the cart, suggest one target item".
-- Several rules can target the same trigger to offer several items.

CREATE TABLE recommendation_rule (
    id                   BIGSERIAL     PRIMARY KEY,
    location_id          BIGINT        NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name                 VARCHAR(150)  NOT NULL,
    trigger_type         VARCHAR(40)   NOT NULL,
    trigger_item_id      BIGINT        REFERENCES menu_item(id) ON DELETE CASCADE,
    trigger_category_id  BIGINT        REFERENCES category(id) ON DELETE CASCADE,
    min_cart_value       NUMERIC(10,2),
    target_item_id       BIGINT        NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    reward_type          VARCHAR(30)   NOT NULL DEFAULT 'FIXED_DISCOUNT',
    reward_value         NUMERIC(10,2) NOT NULL DEFAULT 0,
    priority             INTEGER       NOT NULL DEFAULT 0,
    is_active            BOOLEAN       NOT NULL DEFAULT TRUE,
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100),
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_recommendation_rule_trigger CHECK (
        trigger_type IN ('ITEM_IN_CART', 'CATEGORY_IN_CART', 'CART_VALUE_EXCEEDS')
    ),
    CONSTRAINT chk_recommendation_rule_trigger_fields CHECK (
        (trigger_type = 'ITEM_IN_CART'     AND trigger_item_id IS NOT NULL) OR
        (trigger_type = 'CATEGORY_IN_CART' AND trigger_category_id IS NOT NULL) OR
        (trigger_type = 'CART_VALUE_EXCEEDS' AND min_cart_value IS NOT NULL)
    )
);

CREATE INDEX idx_recommendation_rule_location_active
    ON recommendation_rule (location_id, is_active);

-- Carry over existing upsell rules. The location comes from the target item,
-- because cart-value rules have no trigger item or category to derive it from.
INSERT INTO recommendation_rule (
    location_id, name, trigger_type, trigger_item_id, trigger_category_id,
    min_cart_value, target_item_id, reward_type, reward_value, priority,
    is_active, created_by, updated_by, created_at, updated_at
)
SELECT
    m.location_id,
    r.name,
    r.trigger_type,
    r.trigger_item_id,
    r.trigger_cat_id,
    r.min_cart_value,
    t.item_id,
    r.reward_type,
    r.reward_value,
    r.display_order,
    r.is_active,
    r.created_by,
    r.updated_by,
    r.created_at,
    r.updated_at
FROM rec_upsell_rule r
JOIN rec_upsell_rule_target t ON t.rule_id = r.id
JOIN menu_item m ON m.id = t.item_id
WHERE r.trigger_type IN ('ITEM_IN_CART', 'CATEGORY_IN_CART', 'CART_VALUE_EXCEEDS')
  AND (r.trigger_type <> 'ITEM_IN_CART'     OR r.trigger_item_id IS NOT NULL)
  AND (r.trigger_type <> 'CATEGORY_IN_CART' OR r.trigger_cat_id IS NOT NULL)
  AND (r.trigger_type <> 'CART_VALUE_EXCEEDS' OR r.min_cart_value IS NOT NULL);
