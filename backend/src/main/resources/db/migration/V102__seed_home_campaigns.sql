-- =============================================================================
-- V102__seed_home_campaigns.sql
-- Seeds the Home page campaign content that previously lived as hard-coded
-- React data (frontend/src/components/DealsSection.jsx) so the customer Home
-- page becomes fully API/CMS-driven out of the box. All rows are GLOBAL
-- (location_id NULL) and can be edited/retired from the admin console without
-- any further code change.
-- =============================================================================

INSERT INTO home_campaigns
    (location_id, type, badge, title, subtitle, cta_label, image_url, target_type, target_id, visual_variant, display_order, is_active)
VALUES
    -- HERO billboard
    (NULL, 'HERO', '🔥 BIRYANI FEST', 'UP TO 70% OFF', 'on Biryani & Specials', 'Order Now',
     'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=1200&auto=format&fit=crop',
     'CATEGORY', 'Biryani', 'DARK_LUXURY', 1, TRUE),

    -- DISCOVERY rail
    (NULL, 'DISCOVERY', 'Under ₹149', 'Deals', NULL, 'Explore', NULL,
     'CAMPAIGN', 'under-149', 'GREEN_DEAL', 1, TRUE),
    (NULL, 'DISCOVERY', NULL, 'Biryani', NULL, NULL,
     'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=300&auto=format&fit=crop',
     'CATEGORY', 'Biryani', NULL, 2, TRUE),
    (NULL, 'DISCOVERY', NULL, 'Burgers', NULL, NULL,
     'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=300&auto=format&fit=crop',
     'CATEGORY', 'Burgers', NULL, 3, TRUE),
    (NULL, 'DISCOVERY', NULL, 'Wings', NULL, NULL,
     'https://images.unsplash.com/photo-1527477396000-e27163b481c2?q=80&w=300&auto=format&fit=crop',
     'CATEGORY', 'Wings', NULL, 4, TRUE),
    (NULL, 'DISCOVERY', NULL, 'Sandwiches', NULL, NULL,
     'https://images.unsplash.com/photo-1553909489-cd47e0ef937f?q=80&w=300&auto=format&fit=crop',
     'CATEGORY', 'Sandwiches', NULL, 5, TRUE),
    (NULL, 'DISCOVERY', NULL, 'Breakfast', NULL, NULL,
     'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=300&auto=format&fit=crop',
     'CATEGORY', 'Breakfast', NULL, 6, TRUE),

    -- PROMOTION rail (migrated from DealsSection.jsx DISCOVERY_CARDS)
    (NULL, 'PROMOTION', 'For Groups', 'Party & Team Orders',
     'Let us handle catering for your celebration or team lunch.', 'Start Party Order',
     'https://images.unsplash.com/photo-1529543544282-ea669407fca3?q=80&w=600&auto=format&fit=crop',
     'PARTY_ORDER', NULL, 'RED_PARTY', 1, TRUE),
    (NULL, 'PROMOTION', 'Save up to 20%', 'Build Your Own Combo',
     'Mix & match your favorites. Add more items, unlock bigger savings.', 'Start Building',
     'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop',
     'COMBO', 'byoc', 'GREEN_DEAL', 2, TRUE),
    (NULL, 'PROMOTION', 'Save Up To 20%', 'BroBro Combos',
     'Bundle your favorites and save more with every order.', 'Browse Combos',
     'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop',
     'COMBO', 'combos', 'GREEN_DEAL', 3, TRUE),
    (NULL, 'PROMOTION', 'House Specials', 'BB Exclusive Products',
     'Exclusive recipes crafted by our chefs, nowhere else.', 'Explore Collection',
     'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop',
     'CATEGORY', 'BB Signature Products', 'DARK_LUXURY', 4, TRUE);
