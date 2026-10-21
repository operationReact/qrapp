package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.Product;

/**
 * A catalogue product that shares a name with a product being created. Used to
 * offer assigning the existing product, and its image, instead of a duplicate.
 */
public record ProductSimilarResponse(
        Long productId,
        String name,
        String brand,
        String sku,
        String variantIdentity,
        String imageUrl,
        boolean shareableImage,
        boolean assignedToLocation) {

    public static ProductSimilarResponse of(Product product, boolean assignedToLocation) {
        return new ProductSimilarResponse(
                product.getId(),
                product.getName(),
                product.getBrand(),
                product.getSku(),
                product.getVariantIdentity(),
                product.getImageUrl(),
                product.getImageAsset() != null,
                assignedToLocation);
    }
}
