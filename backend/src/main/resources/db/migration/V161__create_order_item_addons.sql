-- Snapshot of add-ons chosen for an order line. Names and price deltas are copied
-- so history stays correct even if the option is later renamed, repriced or deleted.
CREATE TABLE order_item_addon (
    id             BIGSERIAL PRIMARY KEY,
    order_item_id  BIGINT        NOT NULL REFERENCES order_item (id) ON DELETE CASCADE,
    option_id      BIGINT        REFERENCES addon_option (id) ON DELETE SET NULL,
    group_name     VARCHAR(120)  NOT NULL,
    option_name    VARCHAR(120)  NOT NULL,
    price_delta    NUMERIC(10,2) NOT NULL CHECK (price_delta >= 0)
);

CREATE INDEX idx_order_item_addon_order_item ON order_item_addon (order_item_id);
