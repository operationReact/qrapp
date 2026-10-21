package com.broandbro.qrapp.dto;

/**
 * Filters for browsing the global product catalogue. Null or blank fields are ignored.
 *
 * @param search     free text matched against name, brand, SKU and variant (typo tolerant)
 * @param brand      exact brand name, case-insensitive
 * @param veg        true for vegetarian only, false for non-veg only
 * @param hasImage   true for products with an image, false for products without one
 * @param inLocation true for products already sold at the location, false for the rest
 * @param sort             name, brand, updated, newest or relevance
 * @param sourceLocationId only products already sold at this location (any location the admin can access)
 */
public record GlobalCatalogueFilter(
        String search,
        String brand,
        Boolean veg,
        Boolean hasImage,
        Boolean inLocation,
        String sort,
        Long sourceLocationId) {
}
