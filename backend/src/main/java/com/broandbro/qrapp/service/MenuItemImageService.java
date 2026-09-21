package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.ImageUploadResponse;
import com.broandbro.qrapp.dto.MenuItemImageResponse;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.MenuItemImage;
import com.broandbro.qrapp.exception.FileTooLargeException;
import com.broandbro.qrapp.exception.ImageNotFoundException;
import com.broandbro.qrapp.exception.InvalidImageException;
import com.broandbro.qrapp.exception.MenuItemNotFoundException;
import com.broandbro.qrapp.repository.MenuItemImageRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import net.coobird.thumbnailator.Thumbnails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class MenuItemImageService {

    private static final Logger log = LoggerFactory.getLogger(MenuItemImageService.class);

    private static final long MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024L; // 5 MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );
    private static final int MAX_DIMENSION = 800;
    private static final double COMPRESS_QUALITY = 0.8;

    private final MenuItemImageRepository imageRepository;
    private final MenuRepository menuRepository;

    // -------------------------------------------------------------------------
    // Upload / Replace
    // -------------------------------------------------------------------------

    @Transactional
    public ImageUploadResponse uploadOrReplaceImage(Long menuItemId, Long locationId, MultipartFile file) {
        validateFile(file);

        MenuItem menuItem = menuRepository.findByIdAndLocationId(menuItemId, locationId)
                .orElseThrow(() -> new MenuItemNotFoundException(menuItemId));

        boolean replacing = imageRepository.existsByMenuItemId(menuItemId);

        byte[] optimized = optimizeImage(file);
        String storedContentType = "image/jpeg"; // always stored as jpeg after optimisation
        String currentUser = currentUsername();

        MenuItemImage image;
        if (replacing) {
            image = imageRepository.findByMenuItemId(menuItemId)
                    .orElseThrow(() -> new ImageNotFoundException("Image not found for menu item: " + menuItemId));
            image.setFileName(sanitizeFileName(file.getOriginalFilename()));
            image.setContentType(storedContentType);
            image.setFileSize((long) optimized.length);
            image.setImageData(optimized);
            image.setUpdatedBy(currentUser);
            log.info("Replacing image for menu item id={} by user={}", menuItemId, currentUser);
        } else {
            image = new MenuItemImage();
            image.setMenuItem(menuItem);
            image.setFileName(sanitizeFileName(file.getOriginalFilename()));
            image.setContentType(storedContentType);
            image.setFileSize((long) optimized.length);
            image.setImageData(optimized);
            image.setCreatedBy(currentUser);
            image.setUpdatedBy(currentUser);
            log.info("Uploading new image for menu item id={} by user={}", menuItemId, currentUser);
        }

        MenuItemImage saved = imageRepository.save(image);

        // Keep MenuItem.imageUrl in sync so all menu responses can render the image
        String imageUrl = buildImageUrl(saved.getId());
        menuItem.setImageUrl(imageUrl);
        menuRepository.save(menuItem);

        log.info("Image saved successfully id={} menuItemId={} url={}", saved.getId(), menuItemId, imageUrl);

        return ImageUploadResponse.builder()
                .id(saved.getId())
                .menuItemId(menuItemId)
                .fileName(saved.getFileName())
                .contentType(saved.getContentType())
                .fileSize(saved.getFileSize())
                .imageUrl(buildImageUrl(saved.getId()))
                .replaced(replacing)
                .message(replacing ? "Image replaced successfully" : "Image uploaded successfully")
                .createdBy(saved.getCreatedBy())
                .updatedBy(saved.getUpdatedBy())
                .build();
    }

    // -------------------------------------------------------------------------
    // Get image bytes (for serving)
    // -------------------------------------------------------------------------

    /**
     * Public immutable asset retrieval intentionally remains ID-based. The image
     * owns its MenuItem through the database relationship, and the URL is already
     * embedded in public menu responses; location authorization belongs to the
     * location-scoped menu endpoint, not to the CDN-like image resource.
     */
    @Transactional(readOnly = true)
    public MenuItemImage getImage(Long imageId) {
        return imageRepository.findById(imageId)
                .orElseThrow(() -> new ImageNotFoundException(imageId));
    }

    @Transactional(readOnly = true)
    public MenuItemImage getImageByMenuItemId(Long menuItemId) {
        return imageRepository.findByMenuItemId(menuItemId)
                .orElseThrow(() -> new ImageNotFoundException("No image found for menu item: " + menuItemId));
    }

    // -------------------------------------------------------------------------
    // Metadata only (no byte[])
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public MenuItemImageResponse getImageMetadata(Long imageId) {
        MenuItemImage img = imageRepository.findById(imageId)
                .orElseThrow(() -> new ImageNotFoundException(imageId));
        return toResponse(img);
    }

    @Transactional(readOnly = true)
    public MenuItemImageResponse getImageMetadataByMenuItemId(Long menuItemId) {
        MenuItemImage img = imageRepository.findByMenuItemId(menuItemId)
                .orElseThrow(() -> new ImageNotFoundException("No image found for menu item: " + menuItemId));
        return toResponse(img);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    @Transactional
    public void deleteImage(Long imageId, Long locationId) {
        MenuItemImage image = imageRepository.findByIdAndMenuItemLocationId(imageId, locationId)
                .orElseThrow(() -> new ImageNotFoundException(imageId));
        imageRepository.delete(image);
        log.info("Deleted image id={}", imageId);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            log.warn("Upload attempt with empty file");
            throw new InvalidImageException("File must not be empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            log.warn("Upload attempt exceeds max size: {} bytes", file.getSize());
            throw new FileTooLargeException("File size exceeds maximum allowed 5 MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            log.warn("Invalid content type: {}", contentType);
            throw new InvalidImageException("Invalid image type. Allowed: JPEG, PNG, WEBP");
        }
    }

    private byte[] optimizeImage(MultipartFile file) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Thumbnails.of(file.getInputStream())
                    .size(MAX_DIMENSION, MAX_DIMENSION)
                    .keepAspectRatio(true)
                    .outputFormat("jpeg")
                    .outputQuality(COMPRESS_QUALITY)
                    .toOutputStream(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            log.error("Failed to optimize image", e);
            throw new InvalidImageException("Failed to process image: " + e.getMessage());
        }
    }

    private String sanitizeFileName(String original) {
        if (original == null || original.isBlank()) return "image.jpg";
        // strip path separators
        String name = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        return name.endsWith(".jpg") || name.endsWith(".jpeg") ? name : name + ".jpg";
    }

    private String buildImageUrl(Long imageId) {
        return "/api/menu-items/images/" + imageId;
    }

    private String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            return auth.getName();
        }
        return "system";
    }

    private MenuItemImageResponse toResponse(MenuItemImage img) {
        return MenuItemImageResponse.builder()
                .id(img.getId())
                .menuItemId(img.getMenuItem().getId())
                .fileName(img.getFileName())
                .contentType(img.getContentType())
                .fileSize(img.getFileSize())
                .imageUrl(buildImageUrl(img.getId()))
                .createdAt(img.getCreatedAt())
                .updatedAt(img.getUpdatedAt())
                .createdBy(img.getCreatedBy())
                .updatedBy(img.getUpdatedBy())
                .build();
    }
}
