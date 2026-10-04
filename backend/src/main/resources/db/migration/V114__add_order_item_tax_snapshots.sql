ALTER TABLE order_item
    ADD COLUMN IF NOT EXISTS unit_base_price NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS gross_base_amount NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(7,4),
    ADD COLUMN IF NOT EXISTS cgst_rate NUMERIC(7,4),
    ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS sgst_rate NUMERIC(7,4),
    ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS igst_rate NUMERIC(7,4),
    ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS total_tax NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS unit_customer_price NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS total_customer_price NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS tax_profile_id BIGINT,
    ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(20);

ALTER TABLE order_item
    DROP CONSTRAINT IF EXISTS fk_order_item_tax_profile;

ALTER TABLE order_item
    ADD CONSTRAINT fk_order_item_tax_profile
    FOREIGN KEY (tax_profile_id) REFERENCES tax_profile(id);
