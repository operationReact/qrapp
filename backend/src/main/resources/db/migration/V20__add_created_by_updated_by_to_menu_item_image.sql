-- V20: Add created_by and updated_by to menu_item_image table

ALTER TABLE menu_item_image
    ADD COLUMN created_by VARCHAR(100),
    ADD COLUMN updated_by VARCHAR(100);

