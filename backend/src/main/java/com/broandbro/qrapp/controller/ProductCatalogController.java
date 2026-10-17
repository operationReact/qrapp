package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.service.ProductCatalogService;
import com.broandbro.qrapp.service.CategoryService;
import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/mrp-product")
@RequiredArgsConstructor
public class ProductCatalogController {
    private final ProductCatalogService catalogService;
    private final CategoryService categoryService;
    private final UserService userService;

    @GetMapping("/admin/categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public List<Category> categories(@RequestParam Long locationId) {
        return categoryService.getAllMrpProductCategories(locationId);
    }

    @PostMapping("/admin/categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public ResponseEntity<Category> createCategory(@RequestParam Long locationId,
                                                    @Valid @RequestBody Category category,
                                                    Authentication authentication) {
        category.setId(null);
        User currentUser = userService.findByPhone(authentication.getName()).orElseThrow();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.createMrpProductCategory(locationId, category, currentUser));
    }

    @GetMapping("/products")
    public List<ProductResponse> products(@RequestParam Long locationId) {
        return catalogService.publicProducts(locationId);
    }

    @GetMapping("/products/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public ProductResponse product(@PathVariable Long productId, Authentication authentication) {
        return catalogService.getProduct(productId, authentication);
    }

    @GetMapping("/admin/products")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public Page<ProductResponse> adminProducts(@RequestParam Long locationId,
                                                @RequestParam(required = false) String search,
                                                @RequestParam(required = false) Boolean active,
                                                @RequestParam(required = false) String category,
                                                @RequestParam(defaultValue = "all") String stockStatus,
                                                @RequestParam(defaultValue = "name") String sortBy,
                                                Pageable pageable, Authentication authentication) {
        return catalogService.adminProducts(locationId, search, active, category, stockStatus, sortBy, pageable, authentication);
    }

    @GetMapping("/admin/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public ProductCatalogSummaryResponse summary(@RequestParam Long locationId, Authentication authentication) {
        return catalogService.summary(locationId, authentication);
    }

    @PostMapping("/products")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest request,
                                                   Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogService.create(request, authentication));
    }

    @PutMapping("/products/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public ProductResponse update(@PathVariable Long productId, @Valid @RequestBody ProductUpdateRequest request,
                                  Authentication authentication) {
        return catalogService.update(productId, request, authentication);
    }

    @DeleteMapping("/products/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public void deactivate(@PathVariable Long productId, @RequestParam Long locationId,
                           Authentication authentication) {
        catalogService.deactivate(productId, locationId, authentication);
    }

    @PatchMapping("/products/{productId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public ProductResponse setActive(@PathVariable Long productId, @RequestParam boolean active,
                                     @RequestParam Long locationId,
                                     Authentication authentication) {
        return catalogService.setActive(productId, active, locationId, authentication);
    }

    @PostMapping("/products/{productId}/assignments")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public ProductResponse assign(@PathVariable Long productId, @Valid @RequestBody ProductAssignmentRequest request,
                                  Authentication authentication) {
        return catalogService.assign(productId, request, authentication);
    }

    @PostMapping("/products/{productId}/assignments/bulk")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public ProductResponse assignBulk(@PathVariable Long productId,
                                       @Valid @RequestBody List<@Valid ProductAssignmentRequest> requests,
                                       Authentication authentication) {
        return catalogService.assignBulk(productId, requests, authentication);
    }

    @PutMapping("/products/{productId}/assignments/{locationId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public ProductResponse updateAssignment(@PathVariable Long productId, @PathVariable Long locationId,
                                             @Valid @RequestBody ProductAssignmentRequest request,
                                             Authentication authentication) {
        return catalogService.updateAssignment(productId, locationId, request, authentication);
    }

    @PostMapping(value = "/products/{productId}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public ProductResponse uploadImage(@PathVariable Long productId, @RequestParam Long locationId,
                                       @RequestPart("file") MultipartFile file,
                                       Authentication authentication) {
        return catalogService.uploadImage(productId, locationId, file, authentication);
    }

    @PostMapping("/products/{productId}/image/reuse")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public ProductResponse reuseImage(@PathVariable Long productId, @RequestParam Long locationId,
                                      @RequestParam Long sourceProductId,
                                      Authentication authentication) {
        return catalogService.reuseImage(productId, locationId, sourceProductId, authentication);
    }

    @GetMapping("/admin/products/similar")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public List<ProductSimilarResponse> similar(@RequestParam Long locationId, @RequestParam String name,
                                                Authentication authentication) {
        return catalogService.similarProducts(locationId, name, authentication);
    }

    @PostMapping("/products/{productId}/inventory/movements")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public ProductResponse movement(@PathVariable Long productId,
                                    @Valid @RequestBody ProductInventoryMovementRequest request,
                                    Authentication authentication) {
        return catalogService.recordMovement(productId, request, authentication);
    }

    @GetMapping("/products/{productId}/inventory/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public Page<ProductInventoryMovementResponse> history(@PathVariable Long productId,
                                                          @RequestParam Long locationId,
                                                          Pageable pageable,
                                                          Authentication authentication) {
        return catalogService.history(productId, locationId, pageable, authentication);
    }
}
