package com.broandbro.qrapp.combo.service;

import com.broandbro.qrapp.combo.dto.*;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import com.broandbro.qrapp.combo.entity.*;
import com.broandbro.qrapp.combo.exception.ComboNotFoundException;
import com.broandbro.qrapp.combo.exception.ComboValidationException;
import com.broandbro.qrapp.combo.repository.ComboAnalyticsDailyRepository;
import com.broandbro.qrapp.combo.repository.ComboRepository;
import com.broandbro.qrapp.combo.repository.ComboSpecification;
import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.enums.ComboStatus;
import com.broandbro.qrapp.enums.TimeSlot;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.service.PricingService;
import com.broandbro.qrapp.signature.entity.SignatureProduct;
import com.broandbro.qrapp.signature.repository.SignatureProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ComboServiceImpl implements ComboService {

    private final ComboRepository comboRepo;
    private final ComboAnalyticsDailyRepository analyticsRepo;
    private final CategoryRepository categoryRepo;
    private final MenuRepository menuItemRepo;
    private final SignatureProductRepository signatureProductRepo;
    private final ComboPricingService pricingService;
    private final ComboAvailabilityService availabilityService;
    private final PricingService menuItemPricingService;

    // ── Create ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    @CacheEvict(cacheNames = "combos", allEntries = true)
    public ComboResponse createCombo(ComboCreateRequest req, String createdBy, Long requestedLocationId) {
        log.info("[ComboService] Creating combo '{}' by {}", req.comboName(), createdBy);
        Long locationId = validateItems(req.items(), requestedLocationId);

        BigDecimal originalPrice = computeOriginalPrice(req.items(), locationId);
        pricingService.validatePricing(originalPrice, req.comboPrice());

        Category category = req.categoryId() != null
                ? categoryRepo.findByIdAndLocationIdAndIsDeletedFalse(req.categoryId(), locationId).orElse(null) : null;

        Combo combo = Combo.builder()
                .comboName(req.comboName())
                .shortName(req.shortName())
                .description(req.description())
                .category(category)
                .comboType(req.comboType())
                .originalPrice(originalPrice)
                .comboPrice(req.comboPrice())
                .savingsPercentage(pricingService.calculateSavingsPercentage(originalPrice, req.comboPrice()))
                .imageUrl(req.imageUrl())
                .isFeatured(req.isFeatured())
                .isPreorderEligible(req.isPreorderEligible())
                .isSignatureCombo(req.isSignatureCombo())
                .isActive(true)
                .status(ComboStatus.ACTIVE)
                .timeSlot(req.timeSlot())
                .displayPriority(req.displayPriority())
                .createdBy(createdBy)
                .updatedBy(createdBy)
                .build();

        attachItems(combo, req.items(), locationId);
        attachSchedules(combo, req.schedules());
        attachSignatureProducts(combo, req.signatureProducts());

        return toResponse(comboRepo.save(combo));
    }

    // ── Update ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    @CacheEvict(cacheNames = "combos", allEntries = true)
    public ComboResponse updateCombo(Long id, ComboCreateRequest req, String updatedBy, Long requestedLocationId) {
        log.info("[ComboService] Updating combo {} by {}", id, updatedBy);
        Combo combo = requireActive(id, requestedLocationId);
        Long locationId = validateItems(req.items(), requestedLocationId);

        BigDecimal originalPrice = computeOriginalPrice(req.items(), locationId);
        pricingService.validatePricing(originalPrice, req.comboPrice());

        combo.setComboName(req.comboName());
        combo.setShortName(req.shortName());
        combo.setDescription(req.description());
        combo.setCategory(req.categoryId() != null
                ? categoryRepo.findByIdAndLocationIdAndIsDeletedFalse(req.categoryId(), locationId).orElse(null) : null);
        combo.setComboType(req.comboType());
        combo.setOriginalPrice(originalPrice);
        combo.setComboPrice(req.comboPrice());
        combo.setSavingsPercentage(pricingService.calculateSavingsPercentage(originalPrice, req.comboPrice()));
        combo.setImageUrl(req.imageUrl());
        combo.setIsFeatured(req.isFeatured());
        combo.setIsPreorderEligible(req.isPreorderEligible());
        combo.setIsSignatureCombo(req.isSignatureCombo());
        combo.setTimeSlot(req.timeSlot());
        combo.setDisplayPriority(req.displayPriority());
        combo.setUpdatedBy(updatedBy);

        // Replace child collections
        combo.getItems().clear();
        combo.getSchedules().clear();
        combo.getSignatureProducts().clear();
        attachItems(combo, req.items(), locationId);
        attachSchedules(combo, req.schedules());
        attachSignatureProducts(combo, req.signatureProducts());

        return toResponse(comboRepo.save(combo));
    }

    // ── Read ───────────────────────────────────────────────────────────────────

    @Override
    public ComboResponse getComboById(Long id, Long locationId) {
        return toResponse(requireActive(id, locationId));
    }

    @Override
    @Cacheable(cacheNames = "combos",
               key = "'list:' + #search + ':' + #categoryId + ':' + #isActive + ':' + #isFeatured + ':' + #isPreorder + ':' + #timeSlot + ':' + #pageable.pageNumber")
    public Page<ComboCardResponse> listCombos(String search, Long categoryId, Boolean isActive,
                                               Boolean isFeatured, Boolean isPreorder, TimeSlot timeSlot,
                                               Pageable pageable, Long locationId) {
        return comboRepo.findAll(
                ComboSpecification.buildFilter(search, categoryId, isActive, isFeatured, isPreorder, timeSlot, locationId),
                pageable
        ).map(this::toCardResponse);
    }

    @Override
    @Cacheable(cacheNames = "combos", key = "'public'")
    public List<ComboCardResponse> getPublicCombos() {
        return comboRepo.findAllPublic().stream()
                .map(this::toCardResponse)
                .collect(Collectors.toList());
    }

    // ── Status / Delete ────────────────────────────────────────────────────────

    @Override
    @Transactional
    @CacheEvict(cacheNames = "combos", allEntries = true)
    public ComboResponse updateStatus(Long id, ComboStatusUpdateRequest req, String updatedBy, Long locationId) {
        Combo combo = requireActive(id, locationId);
        combo.setStatus(req.status());
        combo.setIsActive(req.status() == ComboStatus.ACTIVE);
        combo.setUpdatedBy(updatedBy);
        return toResponse(comboRepo.save(combo));
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = "combos", allEntries = true)
    public void deleteCombo(Long id, String deletedBy, Long locationId) {
        Combo combo = requireActive(id, locationId);
        combo.setDeletedAt(Instant.now());
        combo.setStatus(ComboStatus.DELETED);
        combo.setIsActive(false);
        combo.setUpdatedBy(deletedBy);
        comboRepo.save(combo);
        log.info("[ComboService] Soft-deleted combo {} by {}", id, deletedBy);
    }

    // ── Analytics ──────────────────────────────────────────────────────────────

    @Override
    public ComboAnalyticsSummaryResponse getAnalyticsSummary(AnalyticsLocationScope scope) {
        // Restricted user with access to no location: return an all-zero summary
        // without touching the database.
        if (!scope.visible()) {
            return new ComboAnalyticsSummaryResponse(
                    0L, 0L, 0L, 0L, 0L,
                    BigDecimal.ZERO, BigDecimal.ZERO, 0L,
                    List.of());
        }

        LocalDate from = LocalDate.now().minusDays(29);
        LocalDate to   = LocalDate.now();

        boolean allLocations = scope.allLocations();
        List<Long> locationIds = scope.locationIds();

        BigDecimal revenue = nullSafe(analyticsRepo.sumRevenueBetween(from, to, allLocations, locationIds));
        BigDecimal savings = nullSafe(analyticsRepo.sumSavingsBetween(from, to, allLocations, locationIds));
        Long orders        = nullSafeLong(analyticsRepo.sumOrdersBetween(from, to, allLocations, locationIds));

        List<Object[]> top = analyticsRepo.findTopCombos(from, to, allLocations, locationIds, PageRequest.of(0, 5));
        List<ComboAnalyticsSummaryResponse.TopComboEntry> topEntries = top.stream()
                .map(r -> new ComboAnalyticsSummaryResponse.TopComboEntry(
                        (Long) r[0], (String) r[1],
                        ((Number) r[2]).longValue(),
                        (BigDecimal) r[3], (BigDecimal) r[4]))
                .collect(Collectors.toList());

        ComboRepository.ComboCountProjection counts = comboRepo.countMetricsInScope(allLocations, locationIds);

        return new ComboAnalyticsSummaryResponse(
                nullSafeLong(counts.getTotalCombos()),
                nullSafeLong(counts.getActiveCombos()),
                nullSafeLong(counts.getFeaturedCombos()),
                nullSafeLong(counts.getPreorderCombos()),
                nullSafeLong(counts.getSignatureCombos()),
                revenue, savings, orders,
                topEntries
        );
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private Combo requireActive(Long id, Long locationId) {
        return comboRepo.findActiveByIdAndLocation(id, locationId)
                .orElseThrow(() -> new ComboNotFoundException(id));
    }

    private Long validateItems(List<ComboItemRequest> items, Long requestedLocationId) {
        if (items == null || items.size() < 2) {
            throw new ComboValidationException("A combo must have at least 2 items.");
        }
        Set<Long> seen = new java.util.HashSet<>();
        Long locationId = null;
        for (ComboItemRequest item : items) {
            if (!seen.add(item.menuItemId())) {
                throw new ComboValidationException("Duplicate item in combo: menuItemId=" + item.menuItemId());
            }
            if (locationId == null) {
                locationId = menuItemRepo.findLocationIdById(item.menuItemId())
                        .orElseThrow(() -> new ComboValidationException("Menu item not found: " + item.menuItemId()));
            }
            MenuItem mi = menuItemRepo.findByIdAndLocationId(item.menuItemId(), locationId)
                    .orElseThrow(() -> new ComboValidationException("Menu item not found: " + item.menuItemId()));
            if (Boolean.TRUE.equals(mi.getIsHidden())) {
                throw new ComboValidationException("Menu item " + mi.getName() + " is inactive and cannot be added to a combo.");
            }
        }
        if (!requestedLocationId.equals(locationId)) {
            throw new ComboValidationException("Menu items do not belong to the requested location.");
        }
        return locationId;
    }

    private BigDecimal computeOriginalPrice(List<ComboItemRequest> items, Long locationId) {
        // Sum of individual menu item selling prices × quantities
        // Uses MenuItemSellingPriceHistory or MenuItem sellingPrice
        return items.stream()
                .map(req -> {
                    MenuItem mi = menuItemRepo.findByIdAndLocationId(req.menuItemId(), locationId).orElseThrow();
                    // Retrieve latest selling price from pricing service (use 0 as fallback)
                    BigDecimal price = getSellingPrice(mi);
                    return price.multiply(BigDecimal.valueOf(req.quantity()));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Returns the current selling price for a menu item.
     *
     * <p>Resolution order:
     * <ol>
     *   <li>Active price record from {@link PricingService} (MenuItemSellingPriceHistory).</li>
     *   <li>Fall back to {@code MenuItem.sellingPrice} if the history table has no active row.</li>
     *   <li>Fall back to {@link BigDecimal#ZERO} so that combo creation is never blocked by
     *       a missing price — the caller (computeOriginalPrice) will produce a ZERO original
     *       price, which ComboPricingService allows only when comboPrice is also ZERO.</li>
     * </ol>
     */
    private BigDecimal getSellingPrice(MenuItem mi) {
        BigDecimal fromHistory = menuItemPricingService.getCurrentSellingPrice(mi.getId());
        if (fromHistory.compareTo(BigDecimal.ZERO) > 0) {
            return fromHistory;
        }
        log.warn("[ComboService] No selling price available for menuItemId={}; defaulting to ZERO", mi.getId());
        return BigDecimal.ZERO;
    }

    private void attachItems(Combo combo, List<ComboItemRequest> items, Long locationId) {
        if (items == null) return;
        items.forEach(req -> {
            MenuItem mi = menuItemRepo.findByIdAndLocationId(req.menuItemId(), locationId).orElseThrow();
            combo.getItems().add(ComboItem.builder()
                    .combo(combo).menuItem(mi)
                    .quantity(req.quantity()).sortOrder(req.sortOrder())
                    .build());
        });
    }

    private void attachSchedules(Combo combo, List<ComboScheduleRequest> schedules) {
        if (schedules == null) return;
        schedules.forEach(req -> {
            if (req.endTime().isBefore(req.startTime()) || req.endTime().equals(req.startTime())) {
                throw new ComboValidationException("Schedule end time must be after start time for day " + req.dayOfWeek());
            }
            combo.getSchedules().add(ComboSchedule.builder()
                    .combo(combo).dayOfWeek(req.dayOfWeek())
                    .startTime(req.startTime()).endTime(req.endTime())
                    .isActive(req.isActive())
                    .build());
        });
    }

    private void attachSignatureProducts(Combo combo, List<ComboSignatureProductRequest> sigs) {
        if (sigs == null) return;
        sigs.forEach(req -> {
            SignatureProduct sp = signatureProductRepo.findActiveById(req.signatureProductId())
                    .orElseThrow(() -> new ComboValidationException("Signature product not found: " + req.signatureProductId()));
            if (!Boolean.TRUE.equals(sp.getIsComboAttachable())) {
                throw new ComboValidationException("Product '" + sp.getProductName() + "' is not combo-attachable.");
            }
            combo.getSignatureProducts().add(ComboSignatureProduct.builder()
                    .combo(combo).signatureProduct(sp).quantity(req.quantity())
                    .build());
        });
    }

    // ── Mappers ────────────────────────────────────────────────────────────────

    private ComboResponse toResponse(Combo c) {
        var avail = availabilityService.computeAvailability(c);
        return new ComboResponse(
                c.getId(), c.getComboName(), c.getShortName(), c.getDescription(),
                c.getCategory() != null ? c.getCategory().getId() : null,
                c.getCategory() != null ? c.getCategory().getName() : null,
                c.getComboType(), c.getOriginalPrice(), c.getComboPrice(),
                c.getSavingsAmount(), c.getSavingsPercentage(),
                c.getImageUrl(),
                Boolean.TRUE.equals(c.getIsFeatured()),
                Boolean.TRUE.equals(c.getIsPreorderEligible()),
                Boolean.TRUE.equals(c.getIsSignatureCombo()),
                Boolean.TRUE.equals(c.getIsActive()),
                c.getStatus(), c.getTimeSlot(), avail,
                c.getDisplayPriority(), c.getCreatedBy(), c.getUpdatedBy(),
                c.getCreatedAt(), c.getUpdatedAt(),
                c.getItems().stream().map(this::toItemResponse).collect(Collectors.toList()),
                c.getSchedules().stream().map(this::toScheduleResponse).collect(Collectors.toList()),
                c.getSignatureProducts().stream().map(this::toSigResponse).collect(Collectors.toList())
        );
    }

    private ComboCardResponse toCardResponse(Combo c) {
        var avail = availabilityService.computeAvailability(c);
        List<String> names = c.getItems().stream()
                .map(i -> i.getMenuItem().getName()).collect(Collectors.toList());
        return new ComboCardResponse(
                c.getId(), c.getComboName(), c.getComboPrice(), c.getOriginalPrice(),
                c.getSavingsPercentage(),
                Boolean.TRUE.equals(c.getIsFeatured()),
                Boolean.TRUE.equals(c.getIsPreorderEligible()),
                avail, c.getComboType(), c.getImageUrl(), c.getTimeSlot(), names
        );
    }

    private ComboItemResponse toItemResponse(ComboItem i) {
        return new ComboItemResponse(i.getId(), i.getMenuItem().getId(),
                i.getMenuItem().getName(),
                i.getMenuItem().getCategory() != null ? i.getMenuItem().getCategory().getName() : null,
                i.getMenuItem().getIsVeg(), i.getQuantity(), i.getSortOrder());
    }

    private ComboScheduleResponse toScheduleResponse(ComboSchedule s) {
        String[] days = {"", "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"};
        return new ComboScheduleResponse(s.getId(), s.getDayOfWeek(),
                days[s.getDayOfWeek()], s.getStartTime(), s.getEndTime(),
                Boolean.TRUE.equals(s.getIsActive()));
    }

    private ComboSignatureProductResponse toSigResponse(ComboSignatureProduct cs) {
        return new ComboSignatureProductResponse(cs.getId(),
                cs.getSignatureProduct().getId(), cs.getSignatureProduct().getProductName(),
                cs.getSignatureProduct().getSellingPrice(), cs.getSignatureProduct().getImageUrl(),
                cs.getQuantity());
    }

    private BigDecimal nullSafe(BigDecimal v) { return v != null ? v : BigDecimal.ZERO; }
    private long nullSafeLong(Long v)          { return v != null ? v : 0L; }
}
