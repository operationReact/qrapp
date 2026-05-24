package com.broandbro.qrapp.signature.controller;

import com.broandbro.qrapp.signature.dto.*;
import com.broandbro.qrapp.signature.service.SignatureProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * Admin REST controller for B&B Signature Products.
 *
 * <pre>
 * POST   /api/admin/signature-products
 * PUT    /api/admin/signature-products/{id}
 * GET    /api/admin/signature-products
 * GET    /api/admin/signature-products/{id}
 * PATCH  /api/admin/signature-products/{id}/status
 * PATCH  /api/admin/signature-products/{id}/stock
 * DELETE /api/admin/signature-products/{id}
 * GET    /api/admin/signature-products/analytics
 * </pre>
 */
@RestController
@RequestMapping("/api/admin/signature-products")
@RequiredArgsConstructor
@Validated
@Tag(name = "Admin – Signature Products", description = "B&B Private-Label Product Management APIs")
public class SignatureProductAdminController {

    private final SignatureProductService productService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new signature product")
    public ResponseEntity<SignatureProductResponse> createProduct(
            @Valid @RequestBody SignatureProductCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.createProduct(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a signature product")
    public ResponseEntity<SignatureProductResponse> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody SignatureProductCreateRequest request) {
        return ResponseEntity.ok(productService.updateProduct(id, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get full signature product details")
    public ResponseEntity<SignatureProductResponse> getProduct(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List signature products with filters",
               description = "Returns compact product cards. category values: PICKLE|PODI|SNACK|SWEET|BEVERAGE|CONDIMENT|OTHER")
    public ResponseEntity<Page<SignatureProductCardResponse>> listProducts(
            @RequestParam(required = false) String search,
            @Parameter(description = "PICKLE|PODI|SNACK|SWEET|BEVERAGE|CONDIMENT|OTHER")
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Boolean isFeatured,
            @RequestParam(required = false) Boolean isComboAttachable,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(
                productService.listProducts(search, category, isActive, isFeatured, isComboAttachable, pageable));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Enable or disable a signature product")
    public ResponseEntity<SignatureProductResponse> toggleStatus(
            @PathVariable Long id,
            @RequestParam boolean isActive,
            Authentication auth) {
        String user = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(productService.toggleStatus(id, isActive, user));
    }

    @PatchMapping("/{id}/stock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update stock quantity",
               description = "Operations: STOCK_IN | STOCK_OUT | ADJUSTMENT | SALE | RETURN | DAMAGED")
    public ResponseEntity<SignatureProductResponse> updateStock(
            @PathVariable Long id,
            @Valid @RequestBody StockUpdateRequest request,
            Authentication auth) {
        String user = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(productService.updateStock(id, request, user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Soft-delete a signature product")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable Long id, Authentication auth) {
        String user = auth != null ? auth.getName() : "system";
        productService.deleteProduct(id, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Signature product analytics",
               description = "Top sellers, low-stock alerts, revenue — last 30 days.")
    public ResponseEntity<SignatureProductAnalyticsResponse> getAnalytics() {
        return ResponseEntity.ok(productService.getAnalytics());
    }
}

