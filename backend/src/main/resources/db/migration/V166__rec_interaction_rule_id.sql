-- Attributes each recommendation interaction to the cart rule that produced the suggestion,
-- so admins can see acceptance per rule. Deleting a rule keeps its history (rule_id becomes NULL).

ALTER TABLE rec_interaction
    ADD COLUMN rule_id BIGINT NULL;

ALTER TABLE rec_interaction
    ADD CONSTRAINT fk_rec_interaction_rule FOREIGN KEY (rule_id)
        REFERENCES recommendation_rule (id) ON DELETE SET NULL;

CREATE INDEX idx_ri_rule ON rec_interaction (rule_id);
