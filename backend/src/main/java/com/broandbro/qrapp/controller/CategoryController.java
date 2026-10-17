package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.service.CategoryService;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final MenuRepository menuRepository;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Category>> getAllCategories(@RequestParam Long locationId) {
        List<Category> categories = categoryService.getAllCategories(locationId);
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/product-images")
    public ResponseEntity<List<Map<String, String>>> getProductCategoryImages(@RequestParam Long locationId) {
        List<Map<String, String>> images = categoryService.getAllMrpProductCategories(locationId).stream()
                .filter(category -> category.getImageUrl() != null && !category.getImageUrl().isBlank())
                .map(category -> Map.of("name", category.getName(), "imageUrl", category.getImageUrl()))
                .toList();
        return ResponseEntity.ok(images);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Category> getCategoryById(@PathVariable Long id, @RequestParam Long locationId) {
        return categoryService.getCategoryById(locationId, id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<List<MenuItem>> getMenuItemsByCategory(
            @PathVariable Long id, @RequestParam Long locationId) {
        // Verify category exists
        if (!categoryService.getCategoryById(locationId, id).isPresent()) {
            return ResponseEntity.notFound().build();
        }

        // Get all menu items for this category
        List<MenuItem> items = menuRepository.findByCategoryId(locationId, id);
        return ResponseEntity.ok(items);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<Category> createCategory(
            @RequestParam Long locationId,
            @Valid @RequestBody Category category,
            Authentication authentication) {
        category.setId(null);
        Category saved = categoryService.createCategory(locationId, category, currentUser(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<Category> updateCategory(
            @PathVariable Long id,
            @RequestParam Long locationId,
            @Valid @RequestBody Category category,
            Authentication authentication) {
        try {
            Category updated = categoryService.updateCategory(locationId, id, category, currentUser(authentication));
            return ResponseEntity.ok(updated);
        } catch (RuntimeException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<?> deleteCategory(
            @PathVariable Long id,
            @RequestParam Long locationId,
            Authentication authentication) {
        if (!categoryService.getCategoryById(locationId, id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        categoryService.deleteCategory(locationId, id, currentUser(authentication));
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/order")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<Category> reorderCategory(
            @PathVariable Long id,
            @RequestParam Long locationId,
            @RequestBody Map<String, Integer> body,
            Authentication authentication) {
        Integer displayOrder = body.get("displayOrder");
        if (displayOrder == null) {
            return ResponseEntity.badRequest().build();
        }
        Category updated = categoryService.reorderCategory(locationId, id, displayOrder, currentUser(authentication));
        return ResponseEntity.ok(updated);
    }

    // ── Category image management (manual upload + admin-accepted AI) ──────────

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<Category> uploadImage(
            @PathVariable Long id,
            @RequestParam Long locationId,
            @RequestPart("image") MultipartFile image,
            Authentication authentication) {
        Category updated = categoryService.uploadCategoryImage(locationId, id, image, currentUser(authentication));
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}/image")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<Category> removeImage(
            @PathVariable Long id,
            @RequestParam Long locationId,
            Authentication authentication) {
        Category updated = categoryService.removeCategoryImage(locationId, id, currentUser(authentication));
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{id}/image-sources")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    public List<CategoryService.CategoryImageSource> imageSources(
            @PathVariable Long id,
            @RequestParam Long locationId,
            Authentication authentication) {
        return categoryService.imageSources(locationId, id, currentUser(authentication));
    }

    @PostMapping("/{id}/image/reuse")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<Category> reuseImage(
            @PathVariable Long id,
            @RequestParam Long locationId,
            @RequestParam Long sourceCategoryId,
            Authentication authentication) {
        Category updated = categoryService.reuseCategoryImage(
                locationId, id, sourceCategoryId, currentUser(authentication));
        return ResponseEntity.ok(updated);
    }

    /**
     * Synchronously generates a single AI image option for the admin to preview.
     * Nothing is persisted until {@code POST /{id}/apply-generated-image} is called.
     */
    @PostMapping("/{id}/generate-image")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<CategoryService.CategoryImageOption> generateImage(
            @PathVariable Long id,
            @RequestParam Long locationId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {
        String additionalPrompt = body != null ? body.get("additionalPrompt") : null;
        CategoryService.CategoryImageOption option =
                categoryService.generateImageOption(locationId, id, additionalPrompt, currentUser(authentication));
        return ResponseEntity.ok(option);
    }

    @PostMapping("/{id}/apply-generated-image")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<Category> applyGeneratedImage(
            @PathVariable Long id,
            @RequestParam Long locationId,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        String imageUrl = body.get("imageUrl");
        String previousGeneratedUrl = body.get("previousGeneratedUrl");
        if (imageUrl == null || imageUrl.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        Category updated = categoryService.applyGeneratedImage(
                locationId, id, imageUrl, previousGeneratedUrl, currentUser(authentication));
        return ResponseEntity.ok(updated);
    }

    private com.broandbro.qrapp.entity.User currentUser(Authentication authentication) {
        return userService.findByPhone(authentication.getName()).orElseThrow();
    }
}

