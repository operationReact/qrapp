package com.broandbro.qrapp.enums;

/**
 * Describes how a menu item is fulfilled.
 *
 * SELF_PREPARED  – prepared entirely in-house; no vendor procurement needed.
 * OUTSOURCED     – sourced entirely from an external vendor / shop.
 * HYBRID         – partially prepared in-house, partially outsourced
 *                  (e.g. bread bought externally, filling made in-house).
 */
public enum FulfillmentType {
    SELF_PREPARED,
    OUTSOURCED,
    HYBRID
}

