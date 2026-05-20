-- V27: Add AI image generation tracking fields to menu_item
-- All columns are nullable for backward compatibility with existing rows.

DO $$
BEGIN
    -- image_generation_status: tracks the lifecycle state of AI image generation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'menu_item' AND column_name = 'image_generation_status'
    ) THEN
        ALTER TABLE menu_item ADD COLUMN image_generation_status VARCHAR(20);
    END IF;

    -- image_generation_error: stores error message when generation fails
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'menu_item' AND column_name = 'image_generation_error'
    ) THEN
        ALTER TABLE menu_item ADD COLUMN image_generation_error TEXT;
    END IF;

    -- ai_generated_image: flag indicating whether current imageUrl was AI-generated
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'menu_item' AND column_name = 'ai_generated_image'
    ) THEN
        ALTER TABLE menu_item ADD COLUMN ai_generated_image BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- image_prompt: the exact prompt used to generate the image
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'menu_item' AND column_name = 'image_prompt'
    ) THEN
        ALTER TABLE menu_item ADD COLUMN image_prompt TEXT;
    END IF;

    -- image_prompt_hash: SHA-256 hash of the prompt for duplicate detection
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'menu_item' AND column_name = 'image_prompt_hash'
    ) THEN
        ALTER TABLE menu_item ADD COLUMN image_prompt_hash VARCHAR(64);
    END IF;

    -- image_generation_requested_at: timestamp when generation was requested
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'menu_item' AND column_name = 'image_generation_requested_at'
    ) THEN
        ALTER TABLE menu_item ADD COLUMN image_generation_requested_at TIMESTAMPTZ;
    END IF;

    -- image_generation_completed_at: timestamp when generation completed (success or failure)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'menu_item' AND column_name = 'image_generation_completed_at'
    ) THEN
        ALTER TABLE menu_item ADD COLUMN image_generation_completed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Index: fast lookup of items pending image generation
CREATE INDEX IF NOT EXISTS idx_menu_item_image_generation_status
    ON menu_item (image_generation_status)
    WHERE image_generation_status IS NOT NULL;

-- Index: prompt hash for duplicate detection
CREATE INDEX IF NOT EXISTS idx_menu_item_image_prompt_hash
    ON menu_item (image_prompt_hash)
    WHERE image_prompt_hash IS NOT NULL;

-- Add CHECK constraint to ensure only valid enum values are stored
ALTER TABLE menu_item
    DROP CONSTRAINT IF EXISTS chk_image_generation_status;

ALTER TABLE menu_item
    ADD CONSTRAINT chk_image_generation_status
    CHECK (image_generation_status IS NULL OR image_generation_status IN
           ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'));

