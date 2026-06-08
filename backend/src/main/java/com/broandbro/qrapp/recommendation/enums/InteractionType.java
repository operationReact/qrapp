package com.broandbro.qrapp.recommendation.enums;

/**
 * The type of interaction a customer had with a recommendation widget.
 *
 * <ul>
 *   <li>{@link #VIEWED}   – the recommendation widget became visible to the customer.</li>
 *   <li>{@link #ACCEPTED} – the customer added the recommended item to their cart.</li>
 *   <li>{@link #REJECTED} – the customer dismissed / closed the recommendation widget.</li>
 * </ul>
 *
 * <p>Extension note: future interaction types (e.g. {@code CLICKED}, {@code SHARED})
 * can be added here without schema changes — the column is stored as VARCHAR.
 */
public enum InteractionType {
    VIEWED,
    ACCEPTED,
    REJECTED
}

