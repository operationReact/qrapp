-- A rule can now suggest any sellable item from a category, not only one fixed item.
-- Exactly one of target_item_id / target_category_id is set per rule.
-- Existing rules keep their target item, so current behaviour is unchanged.

ALTER TABLE recommendation_rule
    ADD COLUMN target_category_id BIGINT REFERENCES category(id) ON DELETE CASCADE;

ALTER TABLE recommendation_rule
    ALTER COLUMN target_item_id DROP NOT NULL;

ALTER TABLE recommendation_rule
    ADD CONSTRAINT chk_recommendation_rule_target CHECK (
        (target_item_id IS NULL) <> (target_category_id IS NULL)
    );
