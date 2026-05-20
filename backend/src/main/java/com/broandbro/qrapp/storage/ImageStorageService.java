package com.broandbro.qrapp.storage;

/**
 * Abstraction over image storage backends.
 * Currently backed by AWS S3; can be extended for GCS, Azure Blob, local disk, etc.
 */
public interface ImageStorageService {

    /**
     * Uploads a raw image to the storage backend and returns the public URL.
     *
     * @param imageBytes  Raw image bytes (PNG, JPEG, etc.)
     * @param menuItemId  Menu item identifier used for path generation
     * @return Public URL where the image can be accessed
     */
    String uploadMenuItemImage(byte[] imageBytes, Long menuItemId);
}

