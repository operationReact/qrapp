package com.broandbro.qrapp.storage;

/**
 * Abstraction over image storage backends.
 * Currently backed by AWS S3; can be extended for GCS, Azure Blob, local disk, etc.
 */
public interface ImageStorageService {
    record StoredImage(String url, String key) {}
    record StoredContent(byte[] bytes, String contentType) {}

    /**
     * Uploads a raw image to the storage backend and returns the public URL.
     *
     * @param imageBytes  Raw image bytes (PNG, JPEG, etc.)
     * @param menuItemId  Menu item identifier
     * @param locationId  Location identifier for organizing images by location
     * @return Public URL where the image can be accessed
     */
    String uploadMenuItemImage(byte[] imageBytes, Long menuItemId, Long locationId);

    /**
     * Stores a non-menu image under a caller-supplied isolated folder.
     */
    String uploadImage(byte[] imageBytes, String folder, String contentType);

    StoredImage uploadImageWithKey(byte[] imageBytes, String folder, String contentType);

    StoredImage uploadImageWithKey(byte[] imageBytes, String folder, String fileName, String contentType);

    StoredImage uploadLocationImageWithKey(byte[] imageBytes, Long locationId, String locationName, String contentType);

    StoredContent readImage(String key);

    void deleteLocationImageByKey(String key);

    /**
     * Deletes a key from the primary image bucket. Callers must only pass keys
     * that they own; AI workflow services additionally enforce their prefixes.
     */
    void deleteImageByKey(String key);

    /**
     * Deletes an image from storage by its public URL.
     * Silently logs a warning if the URL cannot be resolved to a key.
     *
     * @param publicUrl  The public URL previously returned by {@link #uploadMenuItemImage}
     */
    void deleteImageByUrl(String publicUrl);
}
