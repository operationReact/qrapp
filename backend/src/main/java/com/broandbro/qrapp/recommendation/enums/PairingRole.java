package com.broandbro.qrapp.recommendation.enums;

/**
 * The role the TARGET item plays when paired with a source item.
 *
 * <p>Used by {@code ItemPairing} to classify what role a paired item serves:
 * <ul>
 *   <li>{@link #DRINK}   – a beverage companion (Coke, Lassi, Tea)</li>
 *   <li>{@link #SIDE}    – a complementary side dish (Raita, Chutney, Salad)</li>
 *   <li>{@link #DESSERT} – a sweet finish (Ice Cream, Gulab Jamun)</li>
 *   <li>{@link #ADDON}   – optional extra or customisation (Extra Cheese, Papad)</li>
 * </ul>
 */
public enum PairingRole {
    DRINK,
    SIDE,
    DESSERT,
    ADDON
}

