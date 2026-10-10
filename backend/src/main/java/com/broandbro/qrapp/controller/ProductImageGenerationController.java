package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.ProductImageGenerationResponse;
import com.broandbro.qrapp.service.ProductImageGenerationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/catalog/products/{productId}/ai-image")
@RequiredArgsConstructor
@Tag(name = "Product AI images")
public class ProductImageGenerationController {
    private final ProductImageGenerationService imageService;

    @PostMapping(value = "/generate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    @Operation(summary = "Generate an unpublished product image from a reference")
    public ResponseEntity<ProductImageGenerationResponse> generate(
            @PathVariable Long productId,
            @RequestPart("source") MultipartFile source,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(imageService.generate(productId, source, authentication));
    }

    @PostMapping("/sessions/{sessionId}/regenerate")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public ProductImageGenerationResponse regenerate(@PathVariable Long productId,
                                                       @PathVariable Long sessionId,
                                                       Authentication authentication) {
        return imageService.regenerate(productId, sessionId, authentication);
    }

    @GetMapping("/sessions/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public ProductImageGenerationResponse status(@PathVariable Long productId,
                                                  @PathVariable Long sessionId,
                                                  Authentication authentication) {
        return imageService.status(productId, sessionId, authentication);
    }

    @PostMapping("/sessions/{sessionId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public ProductImageGenerationResponse approve(@PathVariable Long productId,
                                                   @PathVariable Long sessionId,
                                                   Authentication authentication) {
        return imageService.approve(productId, sessionId, authentication);
    }

    @DeleteMapping("/sessions/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPERUSER', 'MANAGER')")
    public ProductImageGenerationResponse discard(@PathVariable Long productId,
                                                   @PathVariable Long sessionId,
                                                   Authentication authentication) {
        return imageService.discard(productId, sessionId, authentication);
    }
}
