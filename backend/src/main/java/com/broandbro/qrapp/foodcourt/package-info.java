/**
 * Food Court Management bounded context.
 *
 * <p>Self-contained property/rent-management domain for multi-stall food
 * courts (buildings the operator leases from a landlord and sub-leases to
 * stall tenants). This context is deliberately decoupled from the ordering
 * domain: it declares its own enums, entities, repositories, services and
 * controllers, uses opaque {@code String} user identifiers instead of
 * foreign keys into {@code users}, and persists to its own {@code fc_*}
 * tables with no foreign keys into ordering tables.</p>
 *
 * <p>The only shared infrastructure it reuses is generic and ordering-free:
 * {@link com.broandbro.qrapp.time.BusinessTime} for the canonical business
 * clock. Document references are stored as opaque metadata URLs/keys.</p>
 */
package com.broandbro.qrapp.foodcourt;
