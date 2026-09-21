-- Rename the supplier schema to Vendor without changing identifiers or data.
-- This migration intentionally leaves earlier Flyway migrations untouched.

DO $$
BEGIN
    IF to_regclass('shop') IS NOT NULL AND to_regclass('vendor') IS NULL THEN
        ALTER TABLE shop RENAME TO vendor;
    END IF;
    IF to_regclass('shop_order') IS NOT NULL AND to_regclass('vendor_order') IS NULL THEN
        ALTER TABLE shop_order RENAME TO vendor_order;
    END IF;
    IF to_regclass('shop_order_item') IS NOT NULL AND to_regclass('vendor_order_item') IS NULL THEN
        ALTER TABLE shop_order_item RENAME TO vendor_order_item;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'vendor' AND column_name = 'shop_name'
    ) THEN
        ALTER TABLE vendor RENAME COLUMN shop_name TO vendor_name;
    END IF;
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'menu_item' AND column_name = 'shop_id'
    ) THEN
        ALTER TABLE menu_item RENAME COLUMN shop_id TO vendor_id;
    END IF;
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'vendor_order' AND column_name = 'shop_id'
    ) THEN
        ALTER TABLE vendor_order RENAME COLUMN shop_id TO vendor_id;
    END IF;
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'vendor_order_item' AND column_name = 'shop_order_id'
    ) THEN
        ALTER TABLE vendor_order_item RENAME COLUMN shop_order_id TO vendor_order_id;
    END IF;
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'vendor_menu_item_cost_history' AND column_name = 'shop_id'
    ) THEN
        ALTER TABLE vendor_menu_item_cost_history RENAME COLUMN shop_id TO vendor_id;
    END IF;
END
$$;

DO $$
BEGIN
    IF to_regclass('shop_id_seq') IS NOT NULL AND to_regclass('vendor_id_seq') IS NULL THEN
        ALTER SEQUENCE shop_id_seq RENAME TO vendor_id_seq;
    END IF;
    IF to_regclass('shop_order_id_seq') IS NOT NULL AND to_regclass('vendor_order_id_seq') IS NULL THEN
        ALTER SEQUENCE shop_order_id_seq RENAME TO vendor_order_id_seq;
    END IF;
    IF to_regclass('shop_order_item_id_seq') IS NOT NULL AND to_regclass('vendor_order_item_id_seq') IS NULL THEN
        ALTER SEQUENCE shop_order_item_id_seq RENAME TO vendor_order_item_id_seq;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'vendor' AND constraint_name = 'shop_phone_number_key'
    ) THEN
        ALTER TABLE vendor RENAME CONSTRAINT shop_phone_number_key TO vendor_phone_number_key;
    END IF;
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'menu_item' AND constraint_name = 'fk_menuitem_shop'
    ) THEN
        ALTER TABLE menu_item RENAME CONSTRAINT fk_menuitem_shop TO fk_menuitem_vendor;
    END IF;
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'vendor_order' AND constraint_name = 'fk_shoporder_shop'
    ) THEN
        ALTER TABLE vendor_order RENAME CONSTRAINT fk_shoporder_shop TO fk_vendororder_vendor;
    END IF;
END
$$;

ALTER INDEX IF EXISTS idx_menuitem_shopid RENAME TO idx_menuitem_vendorid;
ALTER INDEX IF EXISTS idx_shoporder_shopid RENAME TO idx_vendororder_vendorid;
ALTER INDEX IF EXISTS idx_vendorcost_shop_item_from RENAME TO idx_vendorcost_vendor_item_from;

DO $$
BEGIN
    IF to_regclass('idx_soitem_order') IS NOT NULL
       AND to_regclass('idx_vendororderitem_order') IS NULL THEN
        ALTER INDEX idx_soitem_order RENAME TO idx_vendororderitem_order;
    END IF;
    IF to_regclass('idx_shoporderitem_order') IS NOT NULL THEN
        IF to_regclass('idx_vendororderitem_order') IS NULL THEN
            ALTER INDEX idx_shoporderitem_order RENAME TO idx_vendororderitem_order;
        ELSE
            ALTER INDEX idx_shoporderitem_order RENAME TO idx_vendororderitem_order_legacy;
        END IF;
    END IF;
    IF to_regclass('idx_soitem_menuitem') IS NOT NULL
       AND to_regclass('idx_vendororderitem_item') IS NULL THEN
        ALTER INDEX idx_soitem_menuitem RENAME TO idx_vendororderitem_item;
    END IF;
    IF to_regclass('idx_shoporderitem_item') IS NOT NULL THEN
        IF to_regclass('idx_vendororderitem_menuitem') IS NULL THEN
            ALTER INDEX idx_shoporderitem_item RENAME TO idx_vendororderitem_menuitem;
        ELSE
            ALTER INDEX idx_shoporderitem_item RENAME TO idx_vendororderitem_menuitem_legacy;
        END IF;
    END IF;
END
$$;
