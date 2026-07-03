-- V34__add_event_type_and_special_notes_to_party_orders.sql
-- Adds event_type and special_notes columns to party_orders for richer context.

ALTER TABLE party_orders
    ADD COLUMN IF NOT EXISTS event_type    VARCHAR(50),
    ADD COLUMN IF NOT EXISTS special_notes TEXT;

