-- V19: Create menu_item_image table
-- One image per menu item, stored as BYTEA in PostgreSQL

CREATE TABLE menu_item_image (
    id            BIGSERIAL     PRIMARY KEY,
    menu_item_id  BIGINT        NOT NULL UNIQUE,
    file_name     VARCHAR(255)  NOT NULL,
    content_type  VARCHAR(100)  NOT NULL,
    file_size     BIGINT        NOT NULL,
    image_data    BYTEA         NOT NULL,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_menu_item_image_menu_item
        FOREIGN KEY (menu_item_id) REFERENCES menu_item(id) ON DELETE CASCADE
);

CREATE INDEX idx_menu_item_image_menu_item ON menu_item_image (menu_item_id);

