-- Add the demo Essentials catalog to the active GeBBS development location.
DO $$
DECLARE
    v_location_id BIGINT;
    category_id BIGINT;
    tax_id BIGINT;
    product_id BIGINT;
    product_row RECORD;
BEGIN
    SELECT id INTO v_location_id FROM locations WHERE code = 'GEBBS-TG-002' LIMIT 1;
    SELECT id INTO tax_id FROM tax_profile WHERE code = 'NO_GST' LIMIT 1;

    IF v_location_id IS NULL THEN
        RETURN;
    END IF;

    FOR product_row IN
        SELECT * FROM (VALUES
            ('Oreo Vanilla Creme 120g', 'Biscuits', 40::numeric, 30::numeric, '8901030890012', 20::bigint),
            ('Lays Classic Salted 50g', 'Chips', 20::numeric, 14::numeric, '8901491101017', 18::bigint),
            ('KitKat 4 Finger 37g', 'Chocolates', 40::numeric, 30::numeric, '8901234567018', 12::bigint),
            ('Coca-Cola Can 300ml', 'Packaged Drinks', 40::numeric, 32::numeric, '8901030890029', 15::bigint),
            ('Sprite Can 300ml', 'Packaged Drinks', 40::numeric, 32::numeric, '8901030890036', 9::bigint)
        ) AS products(name, category_name, selling_price, purchase_cost, barcode, stock)
    LOOP
        INSERT INTO category (name, description, location_id, is_deleted)
        VALUES (product_row.category_name, 'Packaged retail products', v_location_id, false)
        ON CONFLICT (location_id, name) DO UPDATE SET is_deleted = false
        RETURNING id INTO category_id;

        INSERT INTO menu_item (
            name, category_id, location_id, available, recommended,
            description, is_veg, inventory_mode, is_hidden, product_type,
            barcode, mrp, purchase_cost, tax_profile_id
        )
        VALUES (
            product_row.name, category_id, v_location_id, true,
            product_row.name IN ('Oreo Vanilla Creme 120g', 'Coca-Cola Can 300ml'),
            'Everyday packaged essential.', true, 'LIMITED', false,
            'RETAIL_PRODUCT', product_row.barcode, product_row.selling_price,
            product_row.purchase_cost, tax_id
        )
        ON CONFLICT (location_id, barcode) WHERE barcode IS NOT NULL AND is_deleted = false
        DO UPDATE SET available = true, is_hidden = false
        RETURNING id INTO product_id;

        INSERT INTO menu_item_selling_price_history (
            menu_item_id, selling_price, effective_from, reason, created_at
        )
        SELECT product_id, product_row.selling_price, CURRENT_TIMESTAMP,
               'Retail demo catalog seed', CURRENT_TIMESTAMP
        WHERE NOT EXISTS (
            SELECT 1 FROM menu_item_selling_price_history
            WHERE menu_item_id = product_id AND effective_to IS NULL
        );

        INSERT INTO inventory (
            menu_item_id, available_quantity, reserved_quantity,
            low_stock_threshold, last_updated_at
        )
        VALUES (product_id, product_row.stock, 0, 5, CURRENT_TIMESTAMP)
        ON CONFLICT (menu_item_id) DO UPDATE SET
            available_quantity = EXCLUDED.available_quantity,
            last_updated_at = CURRENT_TIMESTAMP;

        INSERT INTO inventory_audit (
            menu_item_id, action_type, old_quantity, new_quantity, reason
        )
        SELECT product_id, 'OPENING_STOCK', 0, product_row.stock,
               'Retail demo catalog seed'
        WHERE NOT EXISTS (
            SELECT 1 FROM inventory_audit
            WHERE menu_item_id = product_id AND reason = 'Retail demo catalog seed'
        );
    END LOOP;
END $$;
