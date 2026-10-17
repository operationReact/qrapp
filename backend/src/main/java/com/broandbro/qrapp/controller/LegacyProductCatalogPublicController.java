package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.ProductResponse;
import com.broandbro.qrapp.service.ProductCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Temporary public compatibility endpoint for clients that still use the former catalog path.
 */
@RestController
@RequestMapping("/api/catalog")
@RequiredArgsConstructor
public class LegacyProductCatalogPublicController {
    private final ProductCatalogService catalogService;

    @GetMapping("/products")
    public List<ProductResponse> products(@RequestParam Long locationId) {
        return catalogService.publicProducts(locationId);
    }
}
