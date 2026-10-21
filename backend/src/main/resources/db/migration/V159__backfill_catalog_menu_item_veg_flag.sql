-- Menu projections of catalogue (MRP) products were created before product_master.is_veg
-- was defaulted to TRUE (V153), so some copied NULL and render as non-veg on the customer menu.
UPDATE menu_item mi
SET is_veg = pm.is_veg
FROM product_master pm
WHERE mi.product_id = pm.id
  AND mi.is_veg IS DISTINCT FROM pm.is_veg;
