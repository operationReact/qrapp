ALTER TABLE home_campaigns
    ADD COLUMN IF NOT EXISTS title_typography_preset VARCHAR(20),
    ADD COLUMN IF NOT EXISTS subtitle_typography_preset VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cta_typography_preset VARCHAR(20),
    ADD COLUMN IF NOT EXISTS animation_preset VARCHAR(20);

ALTER TABLE home_campaigns
    ADD CONSTRAINT chk_home_campaign_title_typography
        CHECK (title_typography_preset IS NULL OR title_typography_preset IN
            ('MODERN','PREMIUM','FRESH','ELEGANT','IMPACT','FRIENDLY','MINIMAL','EDITORIAL')),
    ADD CONSTRAINT chk_home_campaign_subtitle_typography
        CHECK (subtitle_typography_preset IS NULL OR subtitle_typography_preset IN
            ('MODERN','PREMIUM','FRESH','ELEGANT','IMPACT','FRIENDLY','MINIMAL','EDITORIAL')),
    ADD CONSTRAINT chk_home_campaign_cta_typography
        CHECK (cta_typography_preset IS NULL OR cta_typography_preset IN
            ('MODERN','PREMIUM','FRESH','ELEGANT','IMPACT','FRIENDLY','MINIMAL','EDITORIAL')),
    ADD CONSTRAINT chk_home_campaign_animation
        CHECK (animation_preset IS NULL OR animation_preset IN
            ('NONE','SOFT_FADE','SLIDE_UP','PREMIUM_REVEAL','CINEMATIC_ZOOM','OFFER_PULSE'));
