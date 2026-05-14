package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

/**
 * Handles serving of menu item images stored in the database.
 * Images are retrieved as BLOB data and returned with appropriate MIME types.
 */
@RestController
@RequestMapping("/menu/{id}/image")
@RequiredArgsConstructor
public class MenuImageController {

    private static final Logger log = LoggerFactory.getLogger(MenuImageController.class);
    private static final String DEFAULT_MIME_TYPE = "image/jpeg";

    private final MenuRepository repo;

    /**
     * Retrieve and serve a menu item's image.
     *
     * @param id the menu item ID
     * @return the image data with appropriate content type, or 404 if not found
     */
    @GetMapping
    @Cacheable(cacheNames = "menuItemImages", key = "#id")
    public ResponseEntity<?> getMenuItemImage(@PathVariable Long id) {
        Optional<MenuItem> item = repo.findById(id);

        if (item.isEmpty() || item.get().getImageData() == null) {
            log.debug("Image not found for menu item ID: {}", id);
            return ResponseEntity.notFound().build();
        }

        MenuItem menuItem = item.get();
        String mimeType = menuItem.getImageMimeType() != null
                ? menuItem.getImageMimeType()
                : DEFAULT_MIME_TYPE;

        try {
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(mimeType))
                    .body(menuItem.getImageData());
        } catch (Exception ex) {
            log.error("Error serving image for menu item ID: {}", id, ex);
            return ResponseEntity.status(500).body("Failed to serve image");
        }
    }
}

