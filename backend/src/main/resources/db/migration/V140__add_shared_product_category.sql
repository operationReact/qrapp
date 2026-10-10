ALTER TABLE product_master
    ADD COLUMN IF NOT EXISTS category_name VARCHAR(80);
