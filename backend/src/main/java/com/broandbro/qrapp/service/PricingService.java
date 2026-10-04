package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.pricing.PriceSetRequest;
import com.broandbro.qrapp.dto.pricing.SellingPriceHistoryResponse;
import com.broandbro.qrapp.dto.pricing.VendorCostHistoryResponse;
import com.broandbro.qrapp.dto.pricing.VendorCostSetRequest;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.MenuItemSellingPriceHistory;
import com.broandbro.qrapp.entity.Vendor;
import com.broandbro.qrapp.entity.VendorMenuItemCostHistory;
import com.broandbro.qrapp.entity.TaxProfile;
import com.broandbro.qrapp.enums.TaxType;
import com.broandbro.qrapp.repository.MenuItemSellingPriceHistoryRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.VendorRepository;
import com.broandbro.qrapp.repository.VendorMenuItemCostHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Central pricing resolution service.
 *
 * <p>Responsibilities:
 * <ol>
 *   <li>Resolve the active selling price for a menu item.</li>
 *   <li>Resolve the active procurement cost for a (vendor, menuItem) pair.</li>
 *   <li>Set / update selling prices (closes old record, opens new one).</li>
 *   <li>Set / update vendor procurement costs.</li>
 *   <li>Expose full price histories for analytics / admin UIs.</li>
 * </ol>
 *
 * <p><strong>Thread-safety note:</strong> The "close then insert" pattern is wrapped in
 * a single transaction. For high-concurrency deployments consider adding a unique
 * partial index on the DB level (effectiveTo IS NULL) per item / vendor pair.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PricingService {

    private final MenuItemSellingPriceHistoryRepository sellingPriceRepo;
    private final VendorMenuItemCostHistoryRepository   vendorCostRepo;
    private final MenuRepository    menuRepository;
    private final VendorRepository    vendorRepository;
    private final TaxCalculationService taxCalculationService;

    /**
     * Returns a map of menuItemId → current selling price for all supplied IDs.
     * Executes a single batch query — use this instead of calling
     * {@link #getCurrentSellingPrice} in a loop.
     *
     * Items with no active price record are absent from the returned map.
     */
    public Map<Long, BigDecimal> getCurrentSellingPrices(List<Long> menuItemIds) {
        if (menuItemIds == null || menuItemIds.isEmpty()) return Map.of();
        return sellingPriceRepo.findCurrentPricesForItems(menuItemIds)
                .stream()
                .collect(java.util.stream.Collectors.toMap(
                        h -> h.getMenuItem().getId(),
                        MenuItemSellingPriceHistory::getSellingPrice,
                        // keep latest if somehow duplicates sneak through
                        (a, b) -> a
                ));
    }

    // =========================================================================
    // SELLING PRICE RESOLUTION
    // =========================================================================

    /**
     * Returns the current active selling price for the given menu item.
     *
     * @param menuItemId ID of the menu item
     * @return the selling price, or {@link BigDecimal#ZERO} if no active price exists
     */
    public BigDecimal getCurrentSellingPrice(Long menuItemId) {
        return sellingPriceRepo.findCurrentActive(menuItemId)
                .map(MenuItemSellingPriceHistory::getSellingPrice)
                .orElseGet(() -> {
                    log.warn("No active selling price found for menuItemId={}", menuItemId);
                    return BigDecimal.ZERO;
                });
    }

    /**
     * Returns the selling price for a menu item at an arbitrary historical instant.
     */
    public Optional<BigDecimal> getSellingPriceAt(Long menuItemId, Instant instant) {
        return sellingPriceRepo.findActiveAt(menuItemId, instant)
                .map(MenuItemSellingPriceHistory::getSellingPrice);
    }

    // =========================================================================
    // VENDOR COST RESOLUTION
    // =========================================================================

    /**
     * Returns the current active procurement cost for the given (vendor, menuItem) pair.
     *
     * @param vendorId     ID of the vendor
     * @param menuItemId ID of the menu item
     * @return the cost price, or empty if no active vendor cost exists
     */
    public Optional<BigDecimal> getCurrentVendorCost(Long vendorId, Long menuItemId) {
        return vendorCostRepo.findCurrentActive(vendorId, menuItemId)
                .map(VendorMenuItemCostHistory::getCostPrice);
    }

    /**
     * Returns the cheapest active vendor cost for a menu item across all vendors.
     * Useful for procurement intelligence and margin optimisation.
     */
    public Optional<BigDecimal> getCheapestVendorCost(Long menuItemId) {
        return vendorCostRepo.findAllVendorCostsAt(menuItemId, Instant.now())
                .stream()
                .map(VendorMenuItemCostHistory::getCostPrice)
                .min(BigDecimal::compareTo);
    }

    // =========================================================================
    // SNAPSHOT CREATION (used by OrderService at order-placement time)
    // =========================================================================

    /**
     * Creates a financial snapshot for a single order line item. The active
     * selling-price record is treated as the taxable base price; the customer
     * amount is derived by the centralized tax service.
     *
     * @param menuItemId ID of the ordered item
     * @param vendorId     supplying vendor ID (null for SELF_PREPARED)
     * @param quantity   number of units
     * @return a snapshot record (not persisted – caller persists via OrderItem entity)
     */
    public OrderItemSnapshot createSnapshot(Long menuItemId, Long vendorId, int quantity) {
        MenuItem menuItem = menuRepository.findById(menuItemId)
                .orElseThrow(() -> new IllegalArgumentException("MenuItem not found: " + menuItemId));
        BigDecimal sellingPrice = getCurrentSellingPrice(menuItemId);
        BigDecimal costPrice    = vendorId != null
                ? getCurrentVendorCost(vendorId, menuItemId).orElse(null)
                : null;
        BigDecimal profit    = (costPrice != null) ? sellingPrice.subtract(costPrice) : null;
        BigDecimal lineTotal = sellingPrice.multiply(BigDecimal.valueOf(quantity));
        TaxCalculationService.TaxCalculationResult tax = taxCalculationService.calculate(
                lineTotal, menuItem.getTaxProfile());
        return new OrderItemSnapshot(
                sellingPrice, costPrice, profit, lineTotal, tax,
                menuItem.getTaxProfile() != null ? menuItem.getTaxProfile().getId() : null,
                menuItem.getHsnSac() != null
                        ? menuItem.getHsnSac()
                        : menuItem.getTaxProfile() != null ? menuItem.getTaxProfile().getHsnSac() : null
        );
    }

    /** Immutable value object returned by {@link #createSnapshot}. */
    public record OrderItemSnapshot(
            BigDecimal sellingPriceSnapshot,
            BigDecimal costPriceSnapshot,
            BigDecimal profitSnapshot,
            BigDecimal lineTotal,
            TaxCalculationService.TaxCalculationResult tax,
            Long taxProfileId,
            String hsnSac) {
    }

    public TaxCalculationService.TaxCalculationResult calculateDiscountedTax(
            OrderItemSnapshot snapshot, BigDecimal discountedBaseAmount) {
        TaxCalculationService.TaxCalculationResult original = snapshot.tax();
        TaxType type = original.igstRate().compareTo(BigDecimal.ZERO) > 0
                ? TaxType.INTER_STATE
                : original.cgstRate().compareTo(BigDecimal.ZERO) > 0
                || original.sgstRate().compareTo(BigDecimal.ZERO) > 0
                ? TaxType.INTRA_STATE : TaxType.NONE;
        TaxProfile profile = TaxProfile.builder()
                .taxType(type)
                .gstRate(original.gstRate())
                .cgstRate(original.cgstRate())
                .sgstRate(original.sgstRate())
                .igstRate(original.igstRate())
                .active(true)
                .build();
        return taxCalculationService.calculate(discountedBaseAmount, profile);
    }

    // =========================================================================
    // PRICE MANAGEMENT – SELLING PRICE
    // =========================================================================

    /**
     * Sets a new selling price for a menu item, effective immediately (or at a future instant).
     * Closes any currently active price record first.
     *
     * @param request the new price details
     * @return the saved price history record
     */
    @Transactional
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public MenuItemSellingPriceHistory setSellingPrice(PriceSetRequest request) {
        MenuItem item = menuRepository.findById(request.menuItemId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "MenuItem not found: " + request.menuItemId()));

        Instant effectiveFrom = request.effectiveFrom() != null
                ? request.effectiveFrom()
                : Instant.now();

        // Close any existing open price records
        sellingPriceRepo.closeActivePrices(request.menuItemId(), effectiveFrom);

        MenuItemSellingPriceHistory history = MenuItemSellingPriceHistory.builder()
                .menuItem(item)
                .sellingPrice(request.sellingPrice())
                .effectiveFrom(effectiveFrom)
                .effectiveTo(null) // open-ended
                .reason(request.reason())
                .build();

        MenuItemSellingPriceHistory saved = sellingPriceRepo.save(history);
        log.info("New selling price {} set for menuItemId={} from {}", request.sellingPrice(),
                request.menuItemId(), effectiveFrom);
        return saved;
    }

    /**
     * Returns the full selling price history for a menu item (most recent first).
     */
    public List<SellingPriceHistoryResponse> getSellingPriceHistory(Long menuItemId) {
        return sellingPriceRepo.findAllByMenuItemId(menuItemId)
                .stream()
                .map(h -> new SellingPriceHistoryResponse(
                        h.getId(),
                        h.getSellingPrice(),
                        h.getEffectiveFrom(),
                        h.getEffectiveTo(),
                        h.getReason(),
                        h.getCreatedAt()))
                .collect(Collectors.toList());
    }

    // =========================================================================
    // PRICE MANAGEMENT – VENDOR COST
    // =========================================================================

    /**
     * Sets a new procurement cost for a (vendor, menuItem) pair.
     */
    @Transactional
    public VendorMenuItemCostHistory setVendorCost(VendorCostSetRequest request) {
        MenuItem item = menuRepository.findById(request.menuItemId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "MenuItem not found: " + request.menuItemId()));
        Vendor vendor = vendorRepository.findById(request.vendorId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Vendor not found: " + request.vendorId()));

        Instant effectiveFrom = request.effectiveFrom() != null
                ? request.effectiveFrom()
                : Instant.now();

        // Close existing open cost records for this vendor/item pair
        vendorCostRepo.closeActiveCosts(request.vendorId(), request.menuItemId(), effectiveFrom);

        VendorMenuItemCostHistory history = VendorMenuItemCostHistory.builder()
                .vendor(vendor)
                .menuItem(item)
                .costPrice(request.costPrice())
                .effectiveFrom(effectiveFrom)
                .effectiveTo(null)
                .build();

        VendorMenuItemCostHistory saved = vendorCostRepo.save(history);
        log.info("New vendor cost {} set for vendorId={} menuItemId={} from {}",
                request.costPrice(), request.vendorId(), request.menuItemId(), effectiveFrom);
        return saved;
    }

    /**
     * Returns the full cost history for a (vendor, menuItem) pair (most recent first).
     */
    public List<VendorCostHistoryResponse> getVendorCostHistory(Long vendorId, Long menuItemId) {
        return vendorCostRepo.findAllByVendorAndItem(vendorId, menuItemId)
                .stream()
                .map(h -> new VendorCostHistoryResponse(
                        h.getId(),
                        h.getVendor().getId(),
                        h.getCostPrice(),
                        h.getEffectiveFrom(),
                        h.getEffectiveTo(),
                        h.getCreatedAt()))
                .collect(Collectors.toList());
    }

    /**
     * Returns all vendor costs for a menu item at the current instant (cheapest first).
     * Supports procurement intelligence / vendor comparison dashboards.
     */
    public List<VendorCostHistoryResponse> getAllVendorCostsForItem(Long menuItemId) {
        return vendorCostRepo.findAllVendorCostsAt(menuItemId, Instant.now())
                .stream()
                .map(h -> new VendorCostHistoryResponse(
                        h.getId(),
                        h.getVendor().getId(),
                        h.getCostPrice(),
                        h.getEffectiveFrom(),
                        h.getEffectiveTo(),
                        h.getCreatedAt()))
                .collect(Collectors.toList());
    }
}
