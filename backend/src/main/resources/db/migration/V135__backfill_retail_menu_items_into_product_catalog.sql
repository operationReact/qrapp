-- Compatibility bridge: preserve legacy menu_item IDs and checkout contracts,
-- while making existing retail products available in the shared catalog.
INSERT INTO product_master (
    sku, variant_identity, name, description, mrp, tax_profile_id,
    hsn_sac, image_url, is_active
)
SELECT
    upper(COALESCE(NULLIF(trim(mi.sku_code), ''), 'LEGACY-' || mi.id::text)),
    'DEFAULT',
    mi.name,
    mi.description,
    COALESCE(mi.mrp, 0),
    mi.tax_profile_id,
    mi.hsn_sac,
    mi.image_url,
    NOT COALESCE(mi.is_deleted, false)
FROM menu_item mi
WHERE mi.product_type = 'RETAIL_PRODUCT'
ON CONFLICT (sku, variant_identity) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    tax_profile_id = EXCLUDED.tax_profile_id,
    hsn_sac = EXCLUDED.hsn_sac,
    image_url = COALESCE(EXCLUDED.image_url, product_master.image_url),
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO location_product (
    product_id, location_id, selling_price, is_visible, is_available
)
SELECT
    p.id,
    mi.location_id,
    COALESCE((
        SELECT h.selling_price
        FROM menu_item_selling_price_history h
        WHERE h.menu_item_id = mi.id
        ORDER BY h.effective_from DESC, h.id DESC
        LIMIT 1
    ), COALESCE(mi.mrp, 0)),
    NOT COALESCE(mi.is_hidden, false),
    COALESCE(mi.available, true) AND NOT COALESCE(mi.is_deleted, false)
FROM menu_item mi
JOIN product_master p
  ON p.sku = upper(COALESCE(NULLIF(trim(mi.sku_code), ''), 'LEGACY-' || mi.id::text))
 AND p.variant_identity = 'DEFAULT'
WHERE mi.product_type = 'RETAIL_PRODUCT'
ON CONFLICT (product_id, location_id) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_available = EXCLUDED.is_available,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO product_inventory (
    location_product_id, available_quantity, reserved_quantity, low_stock_threshold
)
SELECT
    lp.id,
    COALESCE(i.available_quantity, 0),
    COALESCE(i.reserved_quantity, 0),
    COALESCE(i.low_stock_threshold, 5)
FROM location_product lp
JOIN product_master p ON p.id = lp.product_id
JOIN menu_item mi
  ON p.sku = upper(COALESCE(NULLIF(trim(mi.sku_code), ''), 'LEGACY-' || mi.id::text))
 AND mi.location_id = lp.location_id
LEFT JOIN inventory i ON i.menu_item_id = mi.id
ON CONFLICT (location_product_id) DO NOTHING;
