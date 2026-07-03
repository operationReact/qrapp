package com.broandbro.qrapp.signature.service;

import com.broandbro.qrapp.enums.SignatureInventoryOperation;
import com.broandbro.qrapp.signature.dto.*;
import com.broandbro.qrapp.signature.entity.SignatureProduct;
import com.broandbro.qrapp.signature.entity.SignatureProductInventoryLog;
import com.broandbro.qrapp.signature.exception.InsufficientStockException;
import com.broandbro.qrapp.signature.exception.SignatureProductNotFoundException;
import com.broandbro.qrapp.signature.repository.SignatureProductAnalyticsDailyRepository;
import com.broandbro.qrapp.signature.repository.SignatureProductInventoryLogRepository;
import com.broandbro.qrapp.signature.repository.SignatureProductRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SignatureProductServiceImpl implements SignatureProductService {

    private final SignatureProductRepository productRepo;
    private final SignatureProductInventoryLogRepository logRepo;
    private final SignatureProductAnalyticsDailyRepository analyticsRepo;

    // ── Create ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    @CacheEvict(cacheNames = "signatureProducts", allEntries = true)
    public SignatureProductResponse createProduct(SignatureProductCreateRequest req) {
        SignatureProduct product = SignatureProduct.builder()
                .productName(req.productName())
                .shortName(req.shortName())
                .description(req.description())
                .category(req.category())
                .imageUrl(req.imageUrl())
                .sellingPrice(req.sellingPrice())
                .procurementPrice(req.procurementPrice())
                .stockQuantity(req.stockQuantity())
                .minimumStockThreshold(req.minimumStockThreshold())
                .isActive(true)
                .isFeatured(req.isFeatured())
                .isComboAttachable(req.isComboAttachable())
                .displayPriority(req.displayPriority())
                .vendorName(req.vendorName())
                .vendorContact(req.vendorContact())
                .build();

        product = productRepo.save(product);

        // Log initial stock if > 0
        if (req.stockQuantity() > 0) {
            logInventory(product, SignatureInventoryOperation.STOCK_IN,
                    req.stockQuantity(), 0, req.stockQuantity(), "Initial stock on creation", currentUser());
        }

        log.info("[SignatureProductService] Created product '{}' id={}", product.getProductName(), product.getId());
        return toResponse(product);
    }

    // ── Update ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    @CacheEvict(cacheNames = "signatureProducts", allEntries = true)
    public SignatureProductResponse updateProduct(Long id, SignatureProductCreateRequest req) {
        SignatureProduct p = requireActive(id);
        p.setProductName(req.productName());
        p.setShortName(req.shortName());
        p.setDescription(req.description());
        p.setCategory(req.category());
        p.setImageUrl(req.imageUrl());
        p.setSellingPrice(req.sellingPrice());
        p.setProcurementPrice(req.procurementPrice());
        p.setMinimumStockThreshold(req.minimumStockThreshold());
        p.setIsFeatured(req.isFeatured());
        p.setIsComboAttachable(req.isComboAttachable());
        p.setDisplayPriority(req.displayPriority());
        p.setVendorName(req.vendorName());
        p.setVendorContact(req.vendorContact());
        return toResponse(productRepo.save(p));
    }

    // ── Read ───────────────────────────────────────────────────────────────────

    @Override
    public SignatureProductResponse getProductById(Long id) {
        return toResponse(requireActive(id));
    }

    @Override
    @Cacheable(cacheNames = "signatureProducts",
               key = "'list:' + #search + ':' + #category + ':' + #isActive + ':' + #isFeatured + ':' + #isComboAttachable + ':' + #pageable.pageNumber")
    public Page<SignatureProductCardResponse> listProducts(String search, String category,
                                                           Boolean isActive, Boolean isFeatured,
                                                           Boolean isComboAttachable, Pageable pageable) {
        Specification<SignatureProduct> spec = buildSpec(search, category, isActive, isFeatured, isComboAttachable);
        return productRepo.findAll(spec, pageable).map(this::toCardResponse);
    }

    // ── Status ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    @CacheEvict(cacheNames = "signatureProducts", allEntries = true)
    public SignatureProductResponse toggleStatus(Long id, boolean isActive, String updatedBy) {
        SignatureProduct p = requireActive(id);
        p.setIsActive(isActive);
        log.info("[SignatureProductService] Product {} set isActive={} by {}", id, isActive, updatedBy);
        return toResponse(productRepo.save(p));
    }

    // ── Stock Update ───────────────────────────────────────────────────────────

    @Override
    @Transactional
    public SignatureProductResponse updateStock(Long id, StockUpdateRequest req, String updatedBy) {
        SignatureProduct p = requireActive(id);
        int before = p.getStockQuantity();
        int delta  = req.quantity();

        // Deducting operations must not go below zero
        boolean isDeduction = req.operation() == SignatureInventoryOperation.STOCK_OUT
                || req.operation() == SignatureInventoryOperation.SALE
                || req.operation() == SignatureInventoryOperation.DAMAGED;

        if (isDeduction && delta > 0 && before < delta) {
            throw new InsufficientStockException(id, delta, before);
        }

        int after = isDeduction ? before - Math.abs(delta) : before + Math.abs(delta);
        after = Math.max(0, after); // safety floor

        p.setStockQuantity(after);
        productRepo.save(p);

        logInventory(p, req.operation(), delta, before, after, req.remarks(), updatedBy);

        if (p.isLowStock()) {
            log.warn("[SignatureProductService] LOW STOCK ALERT: product={} stock={} threshold={}",
                    p.getProductName(), after, p.getMinimumStockThreshold());
        }

        return toResponse(p);
    }

    // ── Delete ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    @CacheEvict(cacheNames = "signatureProducts", allEntries = true)
    public void deleteProduct(Long id, String deletedBy) {
        SignatureProduct p = requireActive(id);
        p.setDeletedAt(Instant.now());
        p.setIsActive(false);
        productRepo.save(p);
        log.info("[SignatureProductService] Soft-deleted product {} by {}", id, deletedBy);
    }

    // ── Analytics ──────────────────────────────────────────────────────────────

    @Override
    public SignatureProductAnalyticsResponse getAnalytics() {
        LocalDate from = LocalDate.now().minusDays(29);
        LocalDate to   = LocalDate.now();

        BigDecimal revenue = nullSafe(analyticsRepo.sumRevenueBetween(from, to));
        long orders        = nullSafeLong(analyticsRepo.sumOrdersBetween(from, to));

        List<Object[]> topRaw = analyticsRepo.findTopProducts(from, to, PageRequest.of(0, 5));
        List<SignatureProductAnalyticsResponse.TopProductEntry> top = topRaw.stream()
                .map(r -> new SignatureProductAnalyticsResponse.TopProductEntry(
                        (Long) r[0], (String) r[1],
                        ((Number) r[2]).longValue(), (BigDecimal) r[3],
                        ((Number) r[4]).intValue(), ((Number) r[5]).intValue()))
                .collect(Collectors.toList());

        List<SignatureProductAnalyticsResponse.LowStockAlert> alerts =
                productRepo.findLowStockProducts().stream()
                        .map(p -> new SignatureProductAnalyticsResponse.LowStockAlert(
                                p.getId(), p.getProductName(), p.getStockQuantity(), p.getMinimumStockThreshold()))
                        .collect(Collectors.toList());

        return new SignatureProductAnalyticsResponse(
                productRepo.countByDeletedAtIsNull(),
                productRepo.countByIsActiveAndDeletedAtIsNull(true),
                productRepo.countLowStock(),
                productRepo.countOutOfStock(),
                revenue, orders, top, alerts
        );
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private SignatureProduct requireActive(Long id) {
        return productRepo.findActiveById(id)
                .orElseThrow(() -> new SignatureProductNotFoundException(id));
    }

    private void logInventory(SignatureProduct p, SignatureInventoryOperation op,
                               int qty, int before, int after, String remarks, String createdBy) {
        logRepo.save(SignatureProductInventoryLog.builder()
                .product(p).operationType(op)
                .quantity(qty).beforeQuantity(before).afterQuantity(after)
                .remarks(remarks).createdBy(createdBy)
                .build());
    }

    private String currentUser() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            return auth != null ? auth.getName() : "system";
        } catch (Exception e) {
            return "system";
        }
    }

    private Specification<SignatureProduct> buildSpec(String search, String category,
                                                       Boolean isActive, Boolean isFeatured,
                                                       Boolean isComboAttachable) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));
            if (search != null && !search.isBlank()) {
                String p = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("productName")), p),
                        cb.like(cb.lower(root.get("shortName")), p)));
            }
            if (category != null) predicates.add(cb.equal(root.get("category").as(String.class), category));
            if (isActive != null) predicates.add(cb.equal(root.get("isActive"), isActive));
            if (isFeatured != null) predicates.add(cb.equal(root.get("isFeatured"), isFeatured));
            if (isComboAttachable != null) predicates.add(cb.equal(root.get("isComboAttachable"), isComboAttachable));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private String stockStatus(SignatureProduct p) {
        if (p.isOutOfStock()) return "OUT_OF_STOCK";
        if (p.isLowStock())   return "LOW_STOCK";
        return "IN_STOCK";
    }

    private SignatureProductResponse toResponse(SignatureProduct p) {
        return new SignatureProductResponse(
                p.getId(), p.getProductName(), p.getShortName(), p.getDescription(),
                p.getCategory(), p.getImageUrl(), p.getSellingPrice(), p.getProcurementPrice(),
                p.getStockQuantity(), p.getMinimumStockThreshold(),
                Boolean.TRUE.equals(p.getIsActive()), Boolean.TRUE.equals(p.getIsFeatured()),
                Boolean.TRUE.equals(p.getIsComboAttachable()), p.getDisplayPriority(),
                p.getVendorName(), p.getVendorContact(), stockStatus(p),
                p.getCreatedAt(), p.getUpdatedAt());
    }

    private SignatureProductCardResponse toCardResponse(SignatureProduct p) {
        return new SignatureProductCardResponse(
                p.getId(), p.getProductName(), p.getSellingPrice(), p.getStockQuantity(),
                Boolean.TRUE.equals(p.getIsFeatured()), Boolean.TRUE.equals(p.getIsComboAttachable()),
                stockStatus(p), p.getImageUrl());
    }

    private BigDecimal nullSafe(BigDecimal v) { return v != null ? v : BigDecimal.ZERO; }
    private long nullSafeLong(Long v)          { return v != null ? v : 0L; }
}

