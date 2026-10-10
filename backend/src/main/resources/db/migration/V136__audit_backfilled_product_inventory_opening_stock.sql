INSERT INTO product_inventory_movement (
    location_product_id, movement_type, quantity_delta,
    quantity_before, quantity_after, reason
)
SELECT
    i.location_product_id, 'OPENING_STOCK', i.available_quantity,
    0, i.available_quantity, 'Legacy retail catalog backfill'
FROM product_inventory i
WHERE i.available_quantity > 0
  AND NOT EXISTS (
      SELECT 1
      FROM product_inventory_movement m
      WHERE m.location_product_id = i.location_product_id
        AND m.movement_type = 'OPENING_STOCK'
        AND m.reason = 'Legacy retail catalog backfill'
  );
