package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.ImageUploadResponse;
import com.broandbro.qrapp.dto.MenuItemImageResponse;
import com.broandbro.qrapp.entity.MenuItemImage;
import com.broandbro.qrapp.service.MenuItemImageService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/menu-items")
@RequiredArgsConstructor
public class MenuItemImageController {

    private static final Logger log = LoggerFactory.getLogger(MenuItemImageController.class);

    private final MenuItemImageService imageService;

    /**
     * POST /api/menu-items/{menuItemId}/image
     * Upload or replace the image for a menu item.
     */
    @PostMapping(value = "/{menuItemId}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
    public ResponseEntity<ImageUploadResponse> uploadImage(
            @PathVariable Long menuItemId,
            @RequestPart("file") MultipartFile file) {
        log.info("Image upload request for menuItemId={}", menuItemId);
        ImageUploadResponse response = imageService.uploadOrReplaceImage(menuItemId, file);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/menu-items/images/{imageId}
     * Serve image bytes directly (browser-renderable).
     */
    @GetMapping("/images/{imageId}")
    public ResponseEntity<byte[]> getImage(@PathVariable Long imageId) {
        MenuItemImage image = imageService.getImage(imageId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.getContentType()))
                .contentLength(image.getFileSize())
                .body(image.getImageData());
    }

    /**
     * GET /api/menu-items/{menuItemId}/image
     * Serve image bytes by menu item id (browser-renderable).
     */
    @GetMapping("/{menuItemId}/image")
    public ResponseEntity<byte[]> getImageByMenuItemId(@PathVariable Long menuItemId) {
        MenuItemImage image = imageService.getImageByMenuItemId(menuItemId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.getContentType()))
                .contentLength(image.getFileSize())
                .body(image.getImageData());
    }

    /**
     * GET /api/menu-items/{menuItemId}/image/metadata
     * Return image metadata (no bytes).
     */
    @GetMapping("/{menuItemId}/image/metadata")
    public ResponseEntity<MenuItemImageResponse> getImageMetadata(@PathVariable Long menuItemId) {
        return ResponseEntity.ok(imageService.getImageMetadataByMenuItemId(menuItemId));
    }

    /**
     * DELETE /api/menu-items/images/{imageId}
     */
    @DeleteMapping("/images/{imageId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
    public ResponseEntity<Void> deleteImage(@PathVariable Long imageId) {
        log.info("Delete image request id={}", imageId);
        imageService.deleteImage(imageId);
        return ResponseEntity.noContent().build();
    }
}

