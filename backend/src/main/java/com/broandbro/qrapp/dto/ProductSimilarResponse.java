package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.LocationProduct;
import com.broandbro.qrapp.entity.Product;

import java.math.BigDecimal;

/**
 * A catalogue product that shares a name with a product being created. Used to
 * offer assigning the existing product, and its image, instead of a duplicate.
 * The reference fields hold the pricing of the most recently updated assignment
 * in any location, so the assign dialog can pre-fill it.
 */
public record ProductSimilarResponse(
        Long productId,
        String name,
        String brand,
        String sku,
        String variantIdentity,
        String imageUrl,
        boolean shareableImage,
        boolean assignedToLocation,
        BigDecimal referenceMrp,
        BigDecimal referenceCostPrice,
        String referenceCategoryName,
        String referenceLocationName) {

    public static ProductSimilarResponse of(Product product, boolean assignedToLocation) {
        return of(product, assignedToLocation, null);
    }

    public static ProductSimilarResponse of(Product product, boolean assignedToLocation, LocationProduct reference) {
        return new ProductSimilarResponse(
                product.getId(),
                product.getName(),
                product.getBrand(),
                product.getSku(),
                product.getVariantIdentity(),
                product.getImageUrl(),
                product.getImageAsset() != null,
                assignedToLocation,
                reference == null ? null : reference.getMrp(),
                reference == null ? null : reference.getCostPrice(),
                reference == null ? null : reference.getCategoryName(),
                reference == null ? null : reference.getLocation().getName());
    }
}
