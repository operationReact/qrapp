ALTER TABLE order_refunds
    ADD COLUMN speed_requested VARCHAR(20),
    ADD COLUMN speed_processed VARCHAR(20),
    ADD COLUMN acquirer_arn VARCHAR(64);
