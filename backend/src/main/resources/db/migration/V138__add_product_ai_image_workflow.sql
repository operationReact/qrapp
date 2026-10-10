ALTER TABLE product_master ADD COLUMN IF NOT EXISTS image_key TEXT;

CREATE TABLE IF NOT EXISTS product_image_generation_session (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES product_master(id),
    status VARCHAR(20) NOT NULL,
    source_url TEXT NOT NULL,
    source_key TEXT NOT NULL,
    source_content_type VARCHAR(40) NOT NULL,
    source_bytes BIGINT NOT NULL,
    source_width INTEGER NOT NULL,
    source_height INTEGER NOT NULL,
    generated_url TEXT,
    generated_key TEXT,
    generated_content_type VARCHAR(40),
    generated_bytes BIGINT,
    generated_width INTEGER,
    generated_height INTEGER,
    provider VARCHAR(80),
    model VARCHAR(160),
    prompt_hash VARCHAR(128),
    estimated_cost_usd NUMERIC(12,6),
    provider_metadata TEXT,
    error_message VARCHAR(1000),
    requested_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    CONSTRAINT chk_product_ai_status CHECK (status IN ('PROCESSING','GENERATED','APPROVED','DISCARDED','FAILED')),
    CONSTRAINT chk_product_ai_source_bytes_positive CHECK (source_bytes > 0)
);

CREATE INDEX IF NOT EXISTS idx_product_ai_session_product_created
    ON product_image_generation_session(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_ai_session_status
    ON product_image_generation_session(status);
