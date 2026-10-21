ALTER TABLE order_refunds
    ADD COLUMN payment_method VARCHAR(20),
    ADD COLUMN payment_vpa VARCHAR(120),
    ADD COLUMN payment_bank VARCHAR(60),
    ADD COLUMN payment_card_last4 VARCHAR(4),
    ADD COLUMN payment_amount NUMERIC(10, 2);
