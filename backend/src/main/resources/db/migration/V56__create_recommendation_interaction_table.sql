-- =============================================================================
-- RECOMMENDATION INTERACTION TRACKING
-- Version     : V56
-- Date        : 2026-06-09
-- Description : Creates the rec_interaction table for tracking recommendation
--               widget interactions (VIEWED / ACCEPTED / REJECTED).
--
--   rec_interaction — one row per customer interaction event:
--     "Customer C at Restaurant R saw Coke recommended with Biryani and accepted it."
--
-- Multi-vendor isolation: all queries MUST filter on restaurant_id so that
-- Restaurant A never sees Restaurant B's analytics data.
--
-- Extension points (columns reserved for future features — nullable, unused now):
--   session_id   → Auto-Learning Pairings: session-level co-acceptance mining.
--   resolved_by  → Recommendation Scoring: per-source conversion analysis.
--   pairing_role → AI Suggestions: role-level acceptance analytics / ML training.
-- =============================================================================

CREATE TABLE IF NOT EXISTS rec_interaction (
    id                   BIGSERIAL     PRIMARY KEY,

    -- Multi-vendor isolation key (mirrors menu_item.shop_id for the source item)
    restaurant_id        BIGINT        NOT NULL,

    -- Nullable — anonymous (unauthenticated) sessions are allowed
    customer_id          BIGINT,

    -- The item the customer had in context (e.g. item just added to cart)
    source_item_id       BIGINT        NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,

    -- The item that was surfaced as a recommendation
    recommended_item_id  BIGINT        NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,

    -- What the customer did: VIEWED | ACCEPTED | REJECTED
    interaction_type     VARCHAR(20)   NOT NULL,

    -- Immutable audit timestamp
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- ── Extension Point Columns ─────────────────────────────────────────────
    -- Do NOT add business logic for these columns in this version.
    -- They exist purely as schema extension points for future sprints.

    -- [FUTURE: Auto-Learning Pairings / AI Suggestions]
    -- Browser / app session token for session-level co-acceptance mining.
    session_id           VARCHAR(100),

    -- [FUTURE: Recommendation Scoring]
    -- Which engine resolved this recommendation: PAIRING | RECOMMENDATION | ENGINE
    resolved_by          VARCHAR(30),

    -- [FUTURE: AI Suggestions]
    -- Meal role of the recommended item: DRINK | SIDE | DESSERT | ADDON
    pairing_role         VARCHAR(20),

    CONSTRAINT chk_ri_interaction_type
        CHECK (interaction_type IN ('VIEWED', 'ACCEPTED', 'REJECTED'))
);

-- Primary analytics query pattern: get all interactions for a restaurant
CREATE INDEX IF NOT EXISTS idx_ri_restaurant_created
    ON rec_interaction (restaurant_id, created_at DESC);

-- Per-pairing aggregation (GROUP BY source + recommended)
CREATE INDEX IF NOT EXISTS idx_ri_source_recommended
    ON rec_interaction (source_item_id, recommended_item_id);

-- Filter by interaction type when computing views/acceptances/rejections
CREATE INDEX IF NOT EXISTS idx_ri_interaction_type
    ON rec_interaction (interaction_type);

-- Optional customer-level analytics (future: personalisation)
CREATE INDEX IF NOT EXISTS idx_ri_customer
    ON rec_interaction (customer_id)
    WHERE customer_id IS NOT NULL;

COMMENT ON TABLE  rec_interaction                    IS 'Tracks recommendation widget interactions: VIEWED, ACCEPTED, REJECTED.';
COMMENT ON COLUMN rec_interaction.restaurant_id      IS 'Multi-vendor isolation key — mirrors menu_item.shop_id. All analytics queries must filter on this column.';
COMMENT ON COLUMN rec_interaction.customer_id        IS 'Authenticated customer ID. NULL for anonymous sessions.';
COMMENT ON COLUMN rec_interaction.source_item_id     IS 'The primary item in context when the recommendation appeared.';
COMMENT ON COLUMN rec_interaction.recommended_item_id IS 'The item surfaced as a recommendation.';
COMMENT ON COLUMN rec_interaction.interaction_type   IS 'VIEWED: widget shown | ACCEPTED: item added to cart | REJECTED: widget dismissed.';
COMMENT ON COLUMN rec_interaction.session_id         IS '[FUTURE: Auto-Learning] Session token for co-acceptance signal mining.';
COMMENT ON COLUMN rec_interaction.resolved_by        IS '[FUTURE: Scoring] Which engine resolved this recommendation (PAIRING / RECOMMENDATION / ENGINE).';
COMMENT ON COLUMN rec_interaction.pairing_role       IS '[FUTURE: AI Suggestions] Meal role of the recommended item (DRINK / SIDE / DESSERT / ADDON).';

