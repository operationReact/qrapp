package com.broandbro.qrapp.enums;

/**
 * Generic navigation target for a Home campaign CTA. The frontend dispatches on
 * this enum (never on campaign title/id) so new campaigns never require a code
 * change.
 */
public enum HomeCampaignTargetType {
    NONE,
    CATEGORY,
    MENU_ITEM,
    COMBO,
    PARTY_ORDER,
    CAMPAIGN,
    EXTERNAL
}
