-- =============================================================================
-- V104__consolidate_home_campaigns_into_hero.sql
-- Course-correction: the customer Home page no longer renders a separate
-- "discovery rail" or "exclusive for you" promotion rail — those duplicated
-- the real Category system and cluttered the page. All promotional/business
-- campaigns now live exclusively in the HERO carousel.
--
-- This migration preserves existing business functionality by converting the
-- meaningful PROMOTION rows (Party Orders, Combo Builder, Combos, Exclusive
-- Products) into HERO slides, and retires the DISCOVERY rail rows (which only
-- duplicated real food categories, e.g. Biryani/Burgers/Wings/Sandwiches, or
-- were a non-category "Under ₹149" tag tile) by deactivating them. No rows
-- are deleted so admins retain full history/audit trail and can reactivate or
-- edit anything from the Home Content admin screen.
-- =============================================================================

UPDATE home_campaigns
SET type = 'HERO',
    display_order = display_order + 10
WHERE type = 'PROMOTION';

UPDATE home_campaigns
SET is_active = FALSE
WHERE type = 'DISCOVERY';
