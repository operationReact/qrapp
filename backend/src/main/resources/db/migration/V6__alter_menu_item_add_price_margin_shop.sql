-- V6__alter_menu_item_add_price_margin_shop.sql

-- =========================================================
-- CREATE SHOP TABLE
-- =========================================================

CREATE TABLE shop (
                      id BIGSERIAL PRIMARY KEY,

                      shop_name VARCHAR(255) NOT NULL,

                      phone_number VARCHAR(50) NOT NULL UNIQUE,

                      alternate_phone_number VARCHAR(50),

                      address TEXT,

                      is_active BOOLEAN DEFAULT TRUE,

                      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                      version BIGINT DEFAULT 0

);

-- =========================================================
-- ALTER MENU_ITEM TABLE
-- =========================================================

ALTER TABLE menu_item
    ADD COLUMN base_price DECIMAL(19,2);

ALTER TABLE menu_item
    ADD COLUMN margin DECIMAL(19,2) DEFAULT 0;

ALTER TABLE menu_item
    ADD COLUMN shop_id BIGINT;

-- Optional:
-- migrate old price data into base_price

UPDATE menu_item
SET base_price = price
WHERE base_price IS NULL;

-- Optional:
-- ensure margin is never null

UPDATE menu_item
SET margin = 0
WHERE margin IS NULL;

ALTER TABLE menu_item
    ADD CONSTRAINT fk_menuitem_shop
        FOREIGN KEY (shop_id)
            REFERENCES shop(id)
            ON DELETE SET NULL;

CREATE INDEX idx_menuitem_shopid
    ON menu_item(shop_id);

-- =========================================================
-- CREATE SHOP ORDER TABLE
-- =========================================================

CREATE TABLE shop_order (
                            id BIGSERIAL PRIMARY KEY,

                            shop_id BIGINT,

                            status VARCHAR(50) NOT NULL,

                            total_amount DECIMAL(19,2) NOT NULL,

                            notes TEXT,

                            ordered_by VARCHAR(255),

                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                            version BIGINT DEFAULT 0,

                            CONSTRAINT fk_shoporder_shop
                                FOREIGN KEY (shop_id)
                                REFERENCES shop(id)
                                ON DELETE SET NULL

);

CREATE INDEX idx_shoporder_shopid
    ON shop_order(shop_id);

-- =========================================================
-- CREATE SHOP ORDER ITEM TABLE
-- =========================================================

CREATE TABLE shop_order_item (
                                 id BIGSERIAL PRIMARY KEY,

                                 shop_order_id BIGINT NOT NULL,

                                 menu_item_id BIGINT NOT NULL,

                                 quantity INT NOT NULL,

                                 base_price_snapshot DECIMAL(19,2) NOT NULL,

                                 margin_snapshot DECIMAL(19,2) NOT NULL,

                                 selling_price_snapshot DECIMAL(19,2) NOT NULL,

                                 product_snapshot JSONB,

                                 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                 CONSTRAINT fk_soitem_order
                                     FOREIGN KEY (shop_order_id)
                                     REFERENCES shop_order(id)
                                     ON DELETE CASCADE,

                                 CONSTRAINT fk_soitem_menuitem
                                     FOREIGN KEY (menu_item_id)
                                     REFERENCES menu_item(id)

);

CREATE INDEX idx_soitem_order
    ON shop_order_item(shop_order_id);

CREATE INDEX idx_soitem_menuitem
    ON shop_order_item(menu_item_id);
