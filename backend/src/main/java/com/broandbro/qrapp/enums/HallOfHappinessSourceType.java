package com.broandbro.qrapp.enums;

/**
 * Provenance of a Hall of Happiness memory photo.
 *
 * CUSTOMER      - uploaded by a customer from their own Bro & Bro experience
 *                 (currently always linked to a completed Party/Event order).
 * ADMIN_CURATED - uploaded directly by an Admin/Super Admin without a
 *                 customer order (curated celebrations, branded events, etc.).
 */
public enum HallOfHappinessSourceType {
    CUSTOMER,
    ADMIN_CURATED
}
