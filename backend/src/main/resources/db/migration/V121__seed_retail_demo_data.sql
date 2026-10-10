-- Development/demo catalog for visualising retail products in the existing UI.
-- The inserts are idempotent and scoped to the existing application locations.

DO $$
DECLARE
    location_row RECORD;
    category_id BIGINT;
    tax_id BIGINT;
    product_id BIGINT;
    stock BIGINT;
BEGIN
    SELECT id INTO tax_id FROM tax_profile WHERE code = 'NO_GST' LIMIT 1;

    FOR location_row IN
        SELECT id, code FROM locations
        WHERE code IN ('PRAGATI_NAGAR', 'MINDSPACE', 'MEENAKSHI_TOWERS')
    LOOP
        INSERT INTO category (name, description, location_id, is_deleted)
        VALUES ('Biscuits', 'Packaged biscuits and cookies', location_row.id, false)
        ON CONFLICT (location_id, name) DO UPDATE SET is_deleted = false
        RETURNING id INTO category_id;

        INSERT INTO menu_item (
            name, category_id, location_id,
            available, recommended, description, is_veg, inventory_mode,
            is_hidden, product_type, barcode, mrp, purchase_cost, tax_profile_id
        )
        VALUES (
            'Oreo Vanilla Creme 120g', category_id, location_row.id,
            true, true, 'Classic vanilla creme sandwich biscuits.', true, 'LIMITED',
            false, 'RETAIL_PRODUCT', '8901030890012', 40, 30, tax_id
        )
        ON CONFLICT (location_id, barcode) WHERE barcode IS NOT NULL AND is_deleted = false
        DO UPDATE SET available = true, is_hidden = false
        RETURNING id INTO product_id;

        INSERT INTO menu_item_selling_price_history (
            menu_item_id, selling_price, effective_from, reason, created_at
        )
        SELECT product_id, 40, CURRENT_TIMESTAMP, 'Retail demo catalog seed', CURRENT_TIMESTAMP
        WHERE NOT EXISTS (
            SELECT 1 FROM menu_item_selling_price_history
            WHERE menu_item_id = product_id AND effective_to IS NULL
        );

        stock := CASE location_row.code
            WHEN 'PRAGATI_NAGAR' THEN 20
            WHEN 'MINDSPACE' THEN 50
            ELSE 12
        END;

        INSERT INTO inventory (
            menu_item_id, available_quantity, reserved_quantity,
            low_stock_threshold, last_updated_at
        )
        VALUES (product_id, stock, 0, 5, CURRENT_TIMESTAMP)
        ON CONFLICT (menu_item_id) DO UPDATE SET
            available_quantity = EXCLUDED.available_quantity,
            low_stock_threshold = EXCLUDED.low_stock_threshold,
            last_updated_at = CURRENT_TIMESTAMP;

        INSERT INTO inventory_audit (
            menu_item_id, action_type, old_quantity, new_quantity, reason
        )
        SELECT product_id, 'OPENING_STOCK', 0, stock, 'Retail demo catalog seed'
        WHERE NOT EXISTS (
            SELECT 1 FROM inventory_audit
            WHERE menu_item_id = product_id AND reason = 'Retail demo catalog seed'
        );

        INSERT INTO category (name, description, location_id, is_deleted)
        VALUES ('Packaged Drinks', 'Bottled and canned beverages', location_row.id, false)
        ON CONFLICT (location_id, name) DO UPDATE SET is_deleted = false
        RETURNING id INTO category_id;

        INSERT INTO menu_item (
            name, category_id, location_id,
            available, recommended, description, is_veg, inventory_mode,
            is_hidden, product_type, barcode, mrp, purchase_cost, tax_profile_id
        )
        VALUES (
            'Coca-Cola Can 300ml', category_id, location_row.id,
            true, false, 'Chilled packaged soft drink.', true, 'LIMITED',
            false, 'RETAIL_PRODUCT', '8901030890029', 40, 32, tax_id
        )
        ON CONFLICT (location_id, barcode) WHERE barcode IS NOT NULL AND is_deleted = false
        DO UPDATE SET available = true, is_hidden = false
        RETURNING id INTO product_id;

        INSERT INTO menu_item_selling_price_history (
            menu_item_id, selling_price, effective_from, reason, created_at
        )
        SELECT product_id, 40, CURRENT_TIMESTAMP, 'Retail demo catalog seed', CURRENT_TIMESTAMP
        WHERE NOT EXISTS (
            SELECT 1 FROM menu_item_selling_price_history
            WHERE menu_item_id = product_id AND effective_to IS NULL
        );

        INSERT INTO inventory (
            menu_item_id, available_quantity, reserved_quantity,
            low_stock_threshold, last_updated_at
        )
        VALUES (product_id, 15, 0, 5, CURRENT_TIMESTAMP)
        ON CONFLICT (menu_item_id) DO NOTHING;

        INSERT INTO inventory_audit (
            menu_item_id, action_type, old_quantity, new_quantity, reason
        )
        SELECT product_id, 'OPENING_STOCK', 0, 15, 'Retail demo catalog seed'
        WHERE NOT EXISTS (
            SELECT 1 FROM inventory_audit
            WHERE menu_item_id = product_id AND reason = 'Retail demo catalog seed'
        );
    END LOOP;
END $$;
