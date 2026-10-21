package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import com.broandbro.qrapp.storage.ImageStorageService;
import com.broandbro.qrapp.dto.pricing.PriceSetRequest;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import javax.imageio.ImageIO;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProductCatalogService {
    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> NEGATIVE_MOVEMENTS = Set.of("SALE", "DAMAGE", "WASTAGE");

    private final ProductRepository productRepository;
    private final LocationProductRepository locationProductRepository;
    private final ProductInventoryRepository inventoryRepository;
    private final ProductInventoryMovementRepository movementRepository;
    private final LocationRepository locationRepository;
    private final TaxProfileRepository taxProfileRepository;
    private final TaxCalculationService taxCalculationService;
    private final LocationAccessService locationAccessService;
    private final UserService userService;
    private final ImageStorageService imageStorageService;
    private final ProductImageEnhancer productImageEnhancer;
    private final ProductImageAssetRepository imageAssetRepository;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private CategoryRepository categoryRepository;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private PricingService pricingService;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private MenuItemSellingPriceHistoryRepository sellingPriceHistoryRepository;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private MenuRepository menuRepository;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private InventoryRepository legacyInventoryRepository;

    @Transactional(readOnly = true)
    public List<ProductResponse> publicProducts(Long locationId) {
        requireActiveLocation(locationId);
        return locationProductRepository.findPublicByLocationId(locationId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse getProduct(Long productId, Authentication authentication) {
        User actor = actor(authentication);
        locationAccessService.requireSuperAdmin(actor);
        return toGlobalResponse(productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found")));
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> adminProducts(Long locationId, Authentication authentication) {
        return adminProductsPage(locationId, null, null, Pageable.unpaged(), authentication).getContent();
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> adminProducts(Long locationId, String search, Boolean active,
                                               Pageable pageable, Authentication authentication) {
        return adminProductsPage(locationId, search, active, pageable, authentication);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> adminProducts(Long locationId, String search, Boolean active,
                                               String category, String stockStatus, String sortBy, Pageable pageable,
                                               Authentication authentication) {
        User actor = actor(authentication);
        if (locationId == null) throw new IllegalArgumentException("locationId is required");
        requireLocation(actor, locationId);
        String normalizedSearch = search == null ? "" : search.trim();
        String normalizedStockStatus = stockStatus == null || stockStatus.isBlank() ? "all" : stockStatus.trim().toLowerCase(Locale.ROOT);
        if (!Set.of("all", "in", "low", "out").contains(normalizedStockStatus)) {
            throw new IllegalArgumentException("Unsupported stock status");
        }
        String normalizedCategory = category == null ? "" : category.trim();
        String normalizedSort = sortBy == null ? "name" : sortBy.trim().toLowerCase(Locale.ROOT);
        if (!Set.of("name", "mrp", "stock", "updated").contains(normalizedSort)) {
            throw new IllegalArgumentException("Unsupported catalogue sort");
        }
        return locationProductRepository.findAdminPage(locationId, normalizedSearch, active, normalizedCategory, normalizedStockStatus, normalizedSort, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public ProductCatalogSummaryResponse summary(Long locationId, Authentication authentication) {
        User actor = actor(authentication);
        if (locationId == null) throw new IllegalArgumentException("locationId is required");
        requireLocation(actor, locationId);
        return locationProductRepository.summarizeByLocationId(locationId);
    }

    private Page<ProductResponse> adminProductsPage(Long locationId, String search, Boolean active,
                                                   Pageable pageable, Authentication authentication) {
        User actor = actor(authentication);
        if (locationId == null) throw new IllegalArgumentException("locationId is required");
        requireLocation(actor, locationId);
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        List<ProductResponse> filtered = locationProductRepository.findByLocationIdOrderByProductNameAsc(locationId)
                .stream().map(this::toResponse)
                .filter(response -> normalizedSearch.isBlank()
                        || response.getName().toLowerCase(Locale.ROOT).contains(normalizedSearch)
                        || (response.getBrand() != null && response.getBrand().toLowerCase(Locale.ROOT).contains(normalizedSearch)))
                .filter(response -> active == null || Boolean.valueOf(active).equals(response.getActive()))
                .toList();
        if (pageable.isUnpaged()) return new PageImpl<>(filtered);
        int start = Math.min((int) pageable.getOffset(), filtered.size());
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        return new PageImpl<>(filtered.subList(start, end), pageable, filtered.size());
    }

    @Transactional
    public ProductResponse create(ProductRequest request, Authentication authentication) {
        User actor = actor(authentication);
        if (request.getLocationId() == null) throw new IllegalArgumentException("locationId is required");
        requireLocation(actor, request.getLocationId());
        String variant = normalizeVariant(request.getVariantIdentity());
        Product product = new Product();
        apply(product, request, variant);
        product = productRepository.save(product);
        LocationProduct assignment = new LocationProduct();
        assignment.setProduct(product);
        assignment.setLocation(activeLocation(request.getLocationId()));
        applyLocationPricing(assignment, request.getMrp(), request.getCostPrice(), request.getCategoryName());
        assignment.setVisible(!Boolean.FALSE.equals(request.getVisible()));
        assignment.setAvailable(!Boolean.FALSE.equals(request.getAvailable()));
        assignment = locationProductRepository.save(assignment);
        createInventory(assignment, request.getInitialStock(), request.getLowStockThreshold(), actor.getId());
        syncProjection(assignment);
        return toResponse(assignment);
    }

    @Transactional
    public ProductResponse update(Long productId, ProductUpdateRequest request, Authentication authentication) {
        User actor = actor(authentication);
        if (request.getLocationId() == null) throw new IllegalArgumentException("locationId is required");
        requireLocation(actor, request.getLocationId());
        Product product = productRepository.findById(productId).orElseThrow(() -> new EntityNotFoundException("Product not found"));
        String variant = normalizeVariant(request.getVariantIdentity());
        apply(product, request, variant);
        product = productRepository.save(product);
        LocationProduct assignment = assignment(productId, request.getLocationId());
        applyLocationPricing(assignment, request.getMrp(), request.getCostPrice(), request.getCategoryName());
        assignment.setVisible(!Boolean.FALSE.equals(request.getVisible()));
        assignment.setAvailable(!Boolean.FALSE.equals(request.getAvailable()));
        ProductInventory inventory = inventoryRepository.findByLocationProductId(assignment.getId())
                .orElseThrow(() -> new IllegalStateException("Inventory is not configured for this assignment"));
        if (request.getAvailableQuantity() != null
                && !request.getAvailableQuantity().equals(inventory.getAvailableQuantity())) {
            long before = inventory.getAvailableQuantity();
            long after = request.getAvailableQuantity();
            long delta = after - before;
            inventory.setAvailableQuantity(after);
            inventoryRepository.save(inventory);

            ProductInventoryMovement movement = new ProductInventoryMovement();
            movement.setLocationProduct(assignment);
            movement.setMovementType(delta > 0 ? "ADD_STOCK" : "REDUCE_STOCK");
            movement.setQuantityDelta(delta);
            movement.setQuantityBefore(before);
            movement.setQuantityAfter(after);
            movement.setReason("Catalogue edit stock adjustment");
            movement.setChangedBy(actor.getId());
            movementRepository.save(movement);
        }
        inventory.setLowStockThreshold(request.getLowStockThreshold() == null ? 5L : request.getLowStockThreshold());
        inventoryRepository.save(inventory);
        syncProjection(assignment);
        return toResponse(locationProductRepository.save(assignment));
    }

    @Transactional
    public void deactivate(Long productId, Long locationId, Authentication authentication) {
        User actor = actor(authentication);
        requireLocation(actor, locationId);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        product.setActive(false);
        productRepository.save(product);
        syncProjection(assignment(productId, locationId));
    }

    @Transactional
    public ProductResponse setActive(Long productId, boolean active, Long locationId, Authentication authentication) {
        User actor = actor(authentication);
        requireLocation(actor, locationId);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        product.setActive(active);
        productRepository.save(product);
        LocationProduct assignment = assignment(productId, locationId);
        syncProjection(assignment);
        return toResponse(assignment);
    }

    @Transactional
    public ProductResponse assign(Long productId, ProductAssignmentRequest request, Authentication authentication) {
        User actor = actor(authentication);
        requireLocation(actor, request.getLocationId());
        Product product = productRepository.findById(productId).orElseThrow(() -> new EntityNotFoundException("Product not found"));
        if (!Boolean.TRUE.equals(product.getActive())) {
            throw new IllegalArgumentException("Cannot assign an inactive product");
        }
        if (locationProductRepository.existsByProductIdAndLocationId(productId, request.getLocationId())) {
            throw new IllegalArgumentException("Product is already assigned to this location");
        }
        LocationProduct assignment = new LocationProduct();
        assignment.setProduct(product);
        assignment.setLocation(activeLocation(request.getLocationId()));
        applyLocationPricing(assignment, request.getMrp(), request.getCostPrice(), request.getCategoryName());
        assignment.setVisible(Boolean.TRUE.equals(request.getVisible()));
        assignment.setAvailable(Boolean.TRUE.equals(request.getAvailable()));
        assignment = locationProductRepository.save(assignment);
        createInventory(assignment, request.getInitialStock(), request.getLowStockThreshold(), actor.getId());
        syncProjection(assignment);
        return toResponse(assignment);
    }

    @Transactional
    public ProductResponse assignBulk(Long productId, List<ProductAssignmentRequest> requests,
                                      Authentication authentication) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("At least one location assignment is required");
        }
        for (ProductAssignmentRequest request : requests) {
            assign(productId, request, authentication);
        }
        return toGlobalResponse(productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found")));
    }

    @Transactional
    public CopyAssignmentsResponse copyAssignments(CopyAssignmentsRequest request, Authentication authentication) {
        User actor = actor(authentication);
        Long sourceId = request.sourceLocationId();
        Long targetId = request.targetLocationId();
        requireLocation(actor, sourceId);
        requireLocation(actor, targetId);
        if (sourceId.equals(targetId)) throw new IllegalArgumentException("Source and target locations must be different");
        java.util.Set<Long> wanted = request.productIds() == null ? null : new java.util.HashSet<>(request.productIds());
        int copied = 0;
        int alreadyAtTarget = 0;
        int inactive = 0;
        for (LocationProduct source : locationProductRepository.findByLocationIdOrderByProductNameAsc(sourceId)) {
            Long productId = source.getProduct().getId();
            if (wanted != null && !wanted.contains(productId)) continue;
            if (!Boolean.TRUE.equals(source.getProduct().getActive())) {
                inactive += 1;
                continue;
            }
            if (locationProductRepository.existsByProductIdAndLocationId(productId, targetId)) {
                alreadyAtTarget += 1;
                continue;
            }
            ProductAssignmentRequest assignment = new ProductAssignmentRequest();
            assignment.setLocationId(targetId);
            assignment.setMrp(source.getMrp());
            assignment.setCostPrice(source.getCostPrice());
            assignment.setCategoryName(source.getCategoryName());
            assignment.setVisible(true);
            assignment.setAvailable(true);
            assignment.setLowStockThreshold(5L);
            assignment.setInitialStock(0L);
            assign(productId, assignment, authentication);
            copied += 1;
        }
        return new CopyAssignmentsResponse(copied, alreadyAtTarget, inactive);
    }

    @Transactional
    public ProductResponse updateAssignment(Long productId, Long locationId,
                                            ProductAssignmentRequest request, Authentication authentication) {
        if (!locationId.equals(request.getLocationId())) {
            throw new IllegalArgumentException("locationId must match the path");
        }
        User actor = actor(authentication);
        requireLocation(actor, locationId);
        LocationProduct assignment = assignment(productId, locationId);
        applyLocationPricing(assignment, request.getMrp(), request.getCostPrice(), request.getCategoryName());
        assignment.setVisible(!Boolean.FALSE.equals(request.getVisible()));
        assignment.setAvailable(!Boolean.FALSE.equals(request.getAvailable()));
        ProductInventory inventory = inventoryRepository.findByLocationProductId(assignment.getId())
                .orElseThrow(() -> new IllegalStateException("Inventory is not configured for this assignment"));
        inventory.setLowStockThreshold(request.getLowStockThreshold() == null ? 5L : request.getLowStockThreshold());
        inventoryRepository.save(inventory);
        syncProjection(assignment);
        return toResponse(locationProductRepository.save(assignment));
    }

    @Transactional
    public ProductResponse uploadImage(Long productId, Long locationId, MultipartFile file,
                                       Authentication authentication) {
        User actor = actor(authentication);
        requireLocation(actor, locationId);
        validateImage(file);
        Product product = productRepository.findById(productId).orElseThrow(() -> new EntityNotFoundException("Product not found"));
        LocationProduct selectedAssignment = assignment(productId, locationId);
        byte[] raw;
        try {
            raw = file.getBytes();
        } catch (IOException e) {
            throw new IllegalArgumentException("Unable to read image");
        }
        attachImageAsset(product, findOrStoreImageAsset(raw));
        syncProjections(product);
        return toResponse(selectedAssignment);
    }

    /**
     * Finds catalogue products similar to the name being typed so an admin can reuse an existing
     * product (and its shared image) at this location instead of creating a duplicate. Matching is
     * order-independent and typo tolerant: every typed word must match a word of the product's
     * name, brand, SKU or variant, either exactly, as a prefix, or within a small edit distance.
     */
    @Transactional(readOnly = true)
    public List<ProductSimilarResponse> similarProducts(Long locationId, String name, Authentication authentication) {
        User actor = actor(authentication);
        requireLocation(actor, locationId);
        List<String> tokens = searchTokens(name);
        if (tokens.isEmpty() || String.join("", tokens).length() < 2) return List.of();
        return productRepository.findAll().stream()
                .map(product -> new ScoredProduct(product, matchScore(product, tokens)))
                .filter(scored -> scored.score() > 0)
                .sorted(java.util.Comparator.comparingInt(ScoredProduct::score).reversed()
                        .thenComparing(scored -> scored.product().getName(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(scored -> scored.product().getId()))
                .limit(10)
                .map(scored -> ProductSimilarResponse.of(scored.product(),
                        locationProductRepository.findByProductIdOrderByLocationNameAsc(scored.product().getId()).stream()
                                .anyMatch(assignment -> locationId.equals(assignment.getLocation().getId()))))
                .toList();
    }

    /**
     * Browses the global product catalogue for reuse at {@code locationId}. Only product identity and image are
     * returned; other locations' MRP, cost and category are never exposed to this location's admins.
     */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<ProductSimilarResponse> globalCatalogue(Long locationId,
                                                                                       GlobalCatalogueFilter filter,
                                                                                       Pageable pageable,
                                                                                       Authentication authentication) {
        User actor = actor(authentication);
        requireLocation(actor, locationId);
        List<String> tokens = searchTokens(filter.search());
        String brand = filter.brand() == null || filter.brand().isBlank() ? null : filter.brand().trim();
        String sort = filter.sort() == null || filter.sort().isBlank()
                ? (tokens.isEmpty() ? "name" : "relevance")
                : filter.sort().trim().toLowerCase(Locale.ROOT);

        java.util.Map<Long, LocationProduct> latestAssignmentByProduct = new java.util.HashMap<>();
        java.util.Set<Long> assignedProductIds = new java.util.HashSet<>();
        java.util.Set<Long> sourceProductIds = new java.util.HashSet<>();
        Long sourceLocationId = filter.sourceLocationId();
        if (sourceLocationId != null) requireLocation(actor, sourceLocationId);
        for (LocationProduct assignment : locationProductRepository.findAll()) {
            Long productId = assignment.getProduct().getId();
            if (locationId.equals(assignment.getLocation().getId())) assignedProductIds.add(productId);
            if (sourceLocationId != null && sourceLocationId.equals(assignment.getLocation().getId())) sourceProductIds.add(productId);
            latestAssignmentByProduct.merge(productId, assignment,
                    (a, b) -> a.getUpdatedAt().isAfter(b.getUpdatedAt()) ? a : b);
        }

        List<ScoredProduct> matches = productRepository.findAll().stream()
                .filter(product -> Boolean.TRUE.equals(product.getActive()))
                .filter(product -> brand == null || brand.equalsIgnoreCase(product.getBrand()))
                .filter(product -> filter.veg() == null || filter.veg().equals(product.getIsVeg()))
                .filter(product -> filter.hasImage() == null || filter.hasImage() == hasImage(product))
                .filter(product -> filter.inLocation() == null
                        || filter.inLocation() == assignedProductIds.contains(product.getId()))
                .filter(product -> sourceLocationId == null || sourceProductIds.contains(product.getId()))
                .map(product -> new ScoredProduct(product, tokens.isEmpty() ? 1 : matchScore(product, tokens)))
                .filter(scored -> scored.score() > 0)
                .sorted(catalogueOrder(sort))
                .toList();

        int start = (int) Math.min(pageable.getOffset(), matches.size());
        int end = (int) Math.min((long) start + pageable.getPageSize(), matches.size());
        List<ProductSimilarResponse> content = matches.subList(start, end).stream()
                .map(scored -> ProductSimilarResponse.of(scored.product(),
                        assignedProductIds.contains(scored.product().getId()),
                        latestAssignmentByProduct.get(scored.product().getId())))
                .toList();
        return new org.springframework.data.domain.PageImpl<>(content, pageable, matches.size());
    }

    /** Distinct brand names across active catalogue products, for the brand filter. */
    @Transactional(readOnly = true)
    public List<String> catalogueBrands(Long locationId, Authentication authentication) {
        requireLocation(actor(authentication), locationId);
        return productRepository.findAll().stream()
                .filter(product -> Boolean.TRUE.equals(product.getActive()))
                .map(Product::getBrand)
                .filter(brand -> brand != null && !brand.isBlank())
                .map(String::trim)
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
    }

    private static boolean hasImage(Product product) {
        return product.getImageUrl() != null && !product.getImageUrl().isBlank();
    }

    private static java.util.Comparator<ScoredProduct> catalogueOrder(String sort) {
        java.util.Comparator<ScoredProduct> byName = java.util.Comparator
                .comparing((ScoredProduct s) -> s.product().getName(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(s -> s.product().getId());
        return switch (sort) {
            case "brand" -> java.util.Comparator
                    .comparing((ScoredProduct s) -> java.util.Objects.toString(s.product().getBrand(), "~"),
                            String.CASE_INSENSITIVE_ORDER)
                    .thenComparing(byName);
            case "updated" -> java.util.Comparator
                    .comparing((ScoredProduct s) -> s.product().getUpdatedAt(),
                            java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder()))
                    .thenComparing(byName);
            case "newest" -> java.util.Comparator
                    .comparing((ScoredProduct s) -> s.product().getCreatedAt(),
                            java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder()))
                    .thenComparing(byName);
            case "relevance" -> java.util.Comparator
                    .comparingInt((ScoredProduct s) -> s.score()).reversed()
                    .thenComparing(byName);
            default -> byName;
        };
    }

    private record ScoredProduct(Product product, int score) {}

    private static final java.util.regex.Pattern SEARCH_WORD_SPLIT = java.util.regex.Pattern.compile("[^\\p{L}\\p{N}]+");

    private List<String> searchTokens(String text) {
        if (text == null) return List.of();
        return SEARCH_WORD_SPLIT.splitAsStream(text.toLowerCase(Locale.ROOT))
                .filter(token -> !token.isBlank())
                .distinct()
                .toList();
    }

    /** Returns 0 when any typed word fails to match; otherwise a score that favours closer matches. */
    private int matchScore(Product product, List<String> tokens) {
        List<String> words = searchTokens(String.join(" ",
                java.util.Objects.toString(product.getName(), ""),
                java.util.Objects.toString(product.getBrand(), ""),
                java.util.Objects.toString(product.getSku(), ""),
                java.util.Objects.toString(product.getVariantIdentity(), "")));
        int total = 0;
        for (String token : tokens) {
            int score = tokenScore(token, words);
            if (score == 0) return 0;
            total += score;
        }
        return total;
    }

    private int tokenScore(String token, List<String> words) {
        int best = 0;
        for (String word : words) {
            int score;
            if (word.equals(token)) {
                score = 3;
            } else if (word.startsWith(token)) {
                score = 2;
            } else if (token.length() >= 3 && word.contains(token)) {
                score = 1;
            } else if (token.length() >= 4) {
                String prefix = word.length() > token.length() ? word.substring(0, token.length()) : word;
                int allowed = token.length() >= 7 ? 2 : 1;
                score = Math.min(editDistance(token, word), editDistance(token, prefix)) <= allowed ? 1 : 0;
            } else {
                score = 0;
            }
            best = Math.max(best, score);
        }
        return best;
    }

    private static int editDistance(String a, String b) {
        int[] previous = new int[b.length() + 1];
        int[] current = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) previous[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            current[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                current[j] = Math.min(Math.min(current[j - 1] + 1, previous[j] + 1), previous[j - 1] + cost);
            }
            int[] swap = previous;
            previous = current;
            current = swap;
        }
        return previous[b.length()];
    }

    /**
     * Points a product at the image asset of another product. Both products share
     * one stored object; the object is released only when no product references it.
     */
    @Transactional
    public ProductResponse reuseImage(Long productId, Long locationId, Long sourceProductId,
                                      Authentication authentication) {
        User actor = actor(authentication);
        requireLocation(actor, locationId);
        if (productId.equals(sourceProductId)) {
            throw new IllegalArgumentException("Choose a different product to reuse the image from");
        }
        Product product = productRepository.findById(productId).orElseThrow(() -> new EntityNotFoundException("Product not found"));
        LocationProduct selectedAssignment = assignment(productId, locationId);
        Product source = productRepository.findById(sourceProductId)
                .orElseThrow(() -> new EntityNotFoundException("Source product not found"));
        ProductImageAsset asset = source.getImageAsset();
        if (asset == null) {
            throw new IllegalArgumentException("This image cannot be shared yet. Re-upload it once to make it reusable.");
        }
        attachImageAsset(product, asset);
        syncProjections(product);
        return toResponse(selectedAssignment);
    }

    private ProductImageAsset findOrStoreImageAsset(byte[] raw) {
        String sha256 = sha256Hex(raw);
        return imageAssetRepository.findByContentSha256(sha256).orElseGet(() -> {
            try {
                ProductImageEnhancer.Enhanced enhanced = productImageEnhancer.enhance(raw);
                ImageStorageService.StoredImage stored = imageStorageService.uploadImageWithKey(
                        enhanced.bytes(), "products/assets", enhanced.contentType());
                ProductImageAsset asset = new ProductImageAsset();
                asset.setContentSha256(sha256);
                asset.setImageUrl(stored.url());
                asset.setImageKey(stored.key());
                asset.setContentType(enhanced.contentType());
                asset.setSizeBytes(enhanced.bytes().length);
                asset.setRefCount(0);
                return imageAssetRepository.save(asset);
            } catch (IOException e) {
                throw new IllegalArgumentException("Unable to read image");
            }
        });
    }

    private void attachImageAsset(Product product, ProductImageAsset requested) {
        ProductImageAsset next = imageAssetRepository.findByIdForUpdate(requested.getId())
                .orElseThrow(() -> new IllegalStateException("Image asset not found"));
        ProductImageAsset previous = product.getImageAsset();
        String previousUrl = product.getImageUrl();
        boolean unchanged = previous != null && Objects.equals(previous.getId(), next.getId());
        if (!unchanged) {
            next.setRefCount(next.getRefCount() + 1);
            imageAssetRepository.save(next);
        }
        product.setImageAsset(next);
        product.setImageUrl(next.getImageUrl());
        product.setImageKey(next.getImageKey());
        productRepository.save(product);
        if (unchanged) return;
        if (previous != null) {
            releaseImageAsset(previous);
        } else if (previousUrl != null && !previousUrl.isBlank() && !previousUrl.equals(next.getImageUrl())) {
            imageStorageService.deleteImageByUrl(previousUrl);
        }
    }

    private void detachImageAsset(Product product) {
        ProductImageAsset previous = product.getImageAsset();
        if (previous == null) return;
        product.setImageAsset(null);
        releaseImageAsset(previous);
    }

    private void releaseImageAsset(ProductImageAsset requested) {
        ProductImageAsset asset = imageAssetRepository.findByIdForUpdate(requested.getId()).orElse(requested);
        int remaining = Math.max(0, asset.getRefCount() - 1);
        asset.setRefCount(remaining);
        if (remaining > 0) {
            imageAssetRepository.save(asset);
            return;
        }
        imageAssetRepository.delete(asset);
        String key = asset.getImageKey();
        runAfterCommit(() -> imageStorageService.deleteImageByKey(key));
    }

    private void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }

    private static String sha256Hex(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    /**
     * Applies an already stored image only after the product AI workflow has
     * been explicitly approved. The legacy projection is updated atomically
     * with the product master fields.
     */
    @Transactional
    public ProductResponse applyApprovedImage(Long productId, String imageUrl, String imageKey,
                                               Authentication authentication) {
        Product product = requireProductImageAccess(productId, authentication);
        String previousUrl = product.getImageUrl();
        boolean wasShared = product.getImageAsset() != null;
        detachImageAsset(product);
        product.setImageUrl(imageUrl);
        product.setImageKey(imageKey);
        productRepository.save(product);
        syncProjections(product);
        if (!wasShared && previousUrl != null && !previousUrl.isBlank() && !previousUrl.equals(imageUrl)) {
            imageStorageService.deleteImageByUrl(previousUrl);
        }
        return toGlobalResponse(product);
    }

    /**
     * Product master images are global, but location-scoped administrators may
     * edit them when the product is assigned to at least one location they can
     * manage. This closes the IDOR gap without widening catalog read access.
     */
    @Transactional(readOnly = true)
    public Product requireProductImageAccess(Long productId, Authentication authentication) {
        User actor = actor(authentication);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        boolean superAdmin = actor.getRole() == UserRole.SUPER_ADMIN
                || Boolean.TRUE.equals(actor.getIsSuperUser());
        if (superAdmin) return product;
        locationAccessService.requireNonKitchenAdmin(actor);
        boolean permitted = locationProductRepository.findByProductIdOrderByLocationNameAsc(productId)
                .stream().anyMatch(assignment -> locationAccessService.canAccessLocation(
                        actor, assignment.getLocation().getId()));
        if (!permitted) throw new AccessDeniedException("product_image_access_denied");
        return product;
    }

    @Transactional
    public ProductResponse recordMovement(Long productId, ProductInventoryMovementRequest request,
                                          Authentication authentication) {
        User actor = actor(authentication);
        requireLocation(actor, request.getLocationId());
        LocationProduct assignment = assignment(productId, request.getLocationId());
        ProductInventory inventory = inventoryRepository.findByLocationProductIdForUpdate(assignment.getId())
                .orElseThrow(() -> new IllegalStateException("Inventory is not configured for this assignment"));
        long delta = NEGATIVE_MOVEMENTS.contains(request.getMovementType().trim().toUpperCase(Locale.ROOT))
                ? -request.getQuantity() : request.getQuantity();
        long before = inventory.getAvailableQuantity();
        long after = before + delta;
        if (after < 0) {
            throw new IllegalArgumentException("Inventory cannot become negative");
        }
        inventory.setAvailableQuantity(after);
        inventoryRepository.save(inventory);
        ProductInventoryMovement movement = new ProductInventoryMovement();
        movement.setLocationProduct(assignment);
        movement.setMovementType(request.getMovementType().trim().toUpperCase(Locale.ROOT));
        movement.setQuantityDelta(delta);
        movement.setQuantityBefore(before);
        movement.setQuantityAfter(after);
        movement.setReason(request.getReason());
        movement.setReferenceId(request.getReferenceId());
        movement.setChangedBy(actor.getId());
        movementRepository.save(movement);
        syncProjection(assignment);
        return toResponse(assignment);
    }

    @Transactional(readOnly = true)
    public Page<ProductInventoryMovementResponse> history(Long productId, Long locationId,
                                                          Pageable pageable, Authentication authentication) {
        User actor = actor(authentication);
        requireLocation(actor, locationId);
        LocationProduct assignment = assignment(productId, locationId);
        return movementRepository.findByLocationProductIdOrderByCreatedAtDesc(assignment.getId(), pageable)
                .map(m -> ProductInventoryMovementResponse.builder()
                        .id(m.getId()).movementType(m.getMovementType()).quantityDelta(m.getQuantityDelta())
                        .quantityBefore(m.getQuantityBefore()).quantityAfter(m.getQuantityAfter())
                        .reason(m.getReason()).referenceId(m.getReferenceId()).changedBy(m.getChangedBy())
                        .createdAt(m.getCreatedAt()).build());
    }

    private void apply(Product product, ProductRequest request, String variant) {
        product.setVariantIdentity(variant);
        product.setName(request.getName().trim());
        product.setBrand(normalizeOptional(request.getBrand()));
        product.setDescription(request.getDescription());
        product.setHsnSac(request.getHsnSac());
        product.setIsVeg(request.getIsVeg() == null ? Boolean.TRUE : request.getIsVeg());
        product.setImageUrl(request.getImageUrl());
        product.setActive(request.getActive() == null || request.getActive());
        product.setTaxProfile(request.getTaxProfileId() == null ? null :
                taxProfileRepository.findById(request.getTaxProfileId())
                        .orElseThrow(() -> new IllegalArgumentException("Tax profile not found")));
    }

    private void apply(Product product, ProductUpdateRequest request, String variant) {
        product.setVariantIdentity(variant);
        product.setName(request.getName().trim());
        product.setBrand(normalizeOptional(request.getBrand()));
        product.setDescription(request.getDescription());
        product.setHsnSac(request.getHsnSac());
        product.setIsVeg(request.getIsVeg() == null ? Boolean.TRUE : request.getIsVeg());
        if (request.getImageUrl() != null && !request.getImageUrl().equals(product.getImageUrl())) {
            if (product.getImageAsset() != null) {
                detachImageAsset(product);
                product.setImageKey(null);
            }
            product.setImageUrl(request.getImageUrl());
        }
        product.setActive(request.getActive() == null || request.getActive());
        product.setTaxProfile(request.getTaxProfileId() == null ? null :
                taxProfileRepository.findById(request.getTaxProfileId())
                        .orElseThrow(() -> new IllegalArgumentException("Tax profile not found")));
    }

    /** MRP, cost and category are owned by each location, so reused products can be priced per store. */
    private void applyLocationPricing(LocationProduct assignment, BigDecimal mrp, BigDecimal costPrice, String categoryName) {
        if (mrp == null || mrp.signum() < 0) throw new IllegalArgumentException("MRP must be zero or more");
        assignment.setMrp(mrp);
        assignment.setCostPrice(costPrice == null ? BigDecimal.ZERO : costPrice);
        assignment.setCategoryName(normalizeOptional(categoryName));
        assignment.setSellingPrice(mrp);
    }

    private void createInventory(LocationProduct assignment, Long stock, Long threshold, Long changedBy) {
        ProductInventory inventory = new ProductInventory();
        inventory.setLocationProduct(assignment);
        long openingStock = stock == null ? 0L : stock;
        if (openingStock < 0) throw new IllegalArgumentException("initialStock cannot be negative");
        if (threshold != null && threshold < 0) throw new IllegalArgumentException("lowStockThreshold cannot be negative");
        inventory.setAvailableQuantity(openingStock);
        inventory.setLowStockThreshold(threshold == null ? 5L : threshold);
        inventoryRepository.save(inventory);
        if (openingStock > 0) {
            ProductInventoryMovement movement = new ProductInventoryMovement();
            movement.setLocationProduct(assignment);
            movement.setMovementType("OPENING_STOCK");
            movement.setQuantityDelta(openingStock);
            movement.setQuantityBefore(0L);
            movement.setQuantityAfter(openingStock);
            movement.setReason("Opening stock");
            movement.setChangedBy(changedBy);
            movementRepository.save(movement);
        }
    }

    private ProductResponse toResponse(LocationProduct assignment) {
        Product product = assignment.getProduct();
        ProductInventory inventory = inventoryRepository.findByLocationProductId(assignment.getId()).orElse(null);
        TaxCalculationService.TaxCalculationResult tax = taxCalculationService.calculateInclusive(
                assignment.getMrp(), product.getTaxProfile());
        return ProductResponse.builder()
                .id(product.getId()).locationProductId(assignment.getId())
                .locationId(assignment.getLocation().getId())
                .variantIdentity(product.getVariantIdentity()).name(product.getName())
                .brand(product.getBrand()).categoryName(assignment.getCategoryName())
                .description(product.getDescription()).mrp(assignment.getMrp()).costPrice(assignment.getCostPrice())
                .profitMarginPercent(profitMarginPercent(assignment.getMrp(), assignment.getCostPrice()))
                .sellingPrice(assignment.getMrp())
                .taxableAmount(tax.taxableAmount()).totalTax(tax.totalTax()).totalAmount(tax.totalAmount())
                .taxProfileId(product.getTaxProfile() == null ? null : product.getTaxProfile().getId())
                .hsnSac(product.getHsnSac()).imageUrl(product.getImageUrl()).active(product.getActive())
                .imageKey(product.getImageKey())
                .isVeg(product.getIsVeg())
                .updatedAt(product.getUpdatedAt())
                .visible(assignment.getVisible()).available(assignment.getAvailable())
                .availableQuantity(inventory == null ? null : inventory.getAvailableQuantity())
                .lowStockThreshold(inventory == null ? null : inventory.getLowStockThreshold())
                .assignments(List.of(ProductAssignmentResponse.builder()
                        .locationProductId(assignment.getId()).locationId(assignment.getLocation().getId())
                        .locationName(assignment.getLocation().getName()).sellingPrice(assignment.getMrp())
                        .visible(assignment.getVisible()).available(assignment.getAvailable())
                        .availableQuantity(inventory == null ? null : inventory.getAvailableQuantity())
                        .lowStockThreshold(inventory == null ? null : inventory.getLowStockThreshold()).build()))
                .build();
    }

    private ProductResponse toGlobalResponse(Product product) {
        List<ProductAssignmentResponse> assignments = java.util.Optional.ofNullable(
                        locationProductRepository.findByProductIdOrderByLocationNameAsc(product.getId()))
                .orElse(List.of())
                .stream().map(assignment -> {
                    ProductInventory inventory = inventoryRepository.findByLocationProductId(assignment.getId()).orElse(null);
                    return ProductAssignmentResponse.builder()
                            .locationProductId(assignment.getId()).locationId(assignment.getLocation().getId())
                            .locationName(assignment.getLocation().getName()).sellingPrice(assignment.getMrp())
                            .visible(assignment.getVisible()).available(assignment.getAvailable())
                            .availableQuantity(inventory == null ? null : inventory.getAvailableQuantity())
                            .lowStockThreshold(inventory == null ? null : inventory.getLowStockThreshold()).build();
                }).toList();
        return ProductResponse.builder().id(product.getId())
                .variantIdentity(product.getVariantIdentity()).name(product.getName()).brand(product.getBrand())
                .description(product.getDescription())
                .taxProfileId(product.getTaxProfile() == null ? null : product.getTaxProfile().getId())
                .hsnSac(product.getHsnSac()).imageUrl(product.getImageUrl()).active(product.getActive())
                .imageKey(product.getImageKey())
                .isVeg(product.getIsVeg())
                .updatedAt(product.getUpdatedAt())
                .assignments(assignments).build();
    }

    private BigDecimal profitMarginPercent(BigDecimal mrp, BigDecimal costPrice) {
        if (mrp == null || costPrice == null || mrp.signum() <= 0) return null;
        return mrp.subtract(costPrice).multiply(BigDecimal.valueOf(100))
                .divide(mrp, 2, RoundingMode.HALF_UP);
    }

    private void syncProjections(Product product) {
        if (menuRepository == null || product.getId() == null) return;
        locationProductRepository.findByProductIdOrderByLocationNameAsc(product.getId()).forEach(this::syncProjection);
    }

    private void syncProjection(LocationProduct assignment) {
        if (menuRepository == null) return;
        MenuItem projection = menuRepository.findByCatalogProductIdAndLocationId(
                        assignment.getProduct().getId(), assignment.getLocation().getId())
                .orElseGet(MenuItem::new);
        boolean newProjection = projection.getId() == null;
        projection.setCatalogProduct(assignment.getProduct());
        projection.setLocation(assignment.getLocation());
        projection.setProductType(com.broandbro.qrapp.enums.ProductType.RETAIL_PRODUCT);
        projection.setName(assignment.getProduct().getName());
        projection.setDescription(assignment.getProduct().getDescription());
        if (categoryRepository != null && assignment.getCategoryName() != null) {
            Category category = categoryRepository.findByLocationIdAndNameAndCategoryTypeAndIsDeletedFalse(
                            assignment.getLocation().getId(), assignment.getCategoryName(),
                            CategoryService.MRP_PRODUCT_CATEGORY)
                    .orElseGet(() -> {
                        Category created = new Category();
                        created.setLocation(assignment.getLocation());
                        created.setName(assignment.getCategoryName());
                        created.setCategoryType(CategoryService.MRP_PRODUCT_CATEGORY);
                        created.setDisplayOrder(0);
                        created.setIsDeleted(false);
                        return categoryRepository.save(created);
                    });
            projection.setCategory(category);
        } else {
            projection.setCategory(null);
        }
        projection.setMrp(assignment.getMrp());
        projection.setPurchaseCost(assignment.getCostPrice());
        projection.setEstimatedCost(assignment.getCostPrice());
        projection.setImageUrl(assignment.getProduct().getImageUrl());
        // sku_code is a legacy globally-unique key. Include the location for
        // new projections; preserve a backfilled legacy SKU on existing rows.
        if (newProjection) {
            projection.setSkuCode("CATALOG-" + assignment.getProduct().getId()
                    + "-" + assignment.getLocation().getId());
        }
        projection.setAvailable(assignment.getAvailable() && Boolean.TRUE.equals(assignment.getProduct().getActive()));
        projection.setIsHidden(!Boolean.TRUE.equals(assignment.getVisible()));
        projection.setIsDeleted(!Boolean.TRUE.equals(assignment.getProduct().getActive()));
        projection.setInventoryMode(com.broandbro.qrapp.enums.InventoryMode.LIMITED);
        projection.setTaxProfile(assignment.getProduct().getTaxProfile());
        projection.setHsnSac(assignment.getProduct().getHsnSac());
        projection.setIsVeg(assignment.getProduct().getIsVeg());
        menuRepository.save(projection);
        if (pricingService != null && sellingPriceHistoryRepository != null
                && assignment.getMrp() != null
                && assignment.getMrp().signum() > 0
                && sellingPriceHistoryRepository.findCurrentActive(projection.getId())
                .map(history -> history.getSellingPrice().compareTo(assignment.getMrp()) != 0)
                .orElse(true)) {
            pricingService.setSellingPrice(new PriceSetRequest(
                    projection.getId(), assignment.getMrp(), null, "Catalog MRP"));
        }
        syncLegacyInventory(assignment, projection);
    }

    private void syncLegacyInventory(LocationProduct assignment, MenuItem projection) {
        if (legacyInventoryRepository == null || projection.getId() == null) return;
        ProductInventory catalogInventory = inventoryRepository.findByLocationProductId(assignment.getId()).orElse(null);
        if (catalogInventory == null) return;
        Inventory legacy = legacyInventoryRepository.findByMenuItemId(projection.getId())
                .orElseGet(() -> {
                    Inventory created = new Inventory();
                    created.setMenuItem(projection);
                    return created;
                });
        legacy.setAvailableQuantity(catalogInventory.getAvailableQuantity());
        legacy.setReservedQuantity(catalogInventory.getReservedQuantity());
        legacy.setLowStockThreshold(catalogInventory.getLowStockThreshold());
        legacyInventoryRepository.save(legacy);
    }

    private LocationProduct assignment(Long productId, Long locationId) {
        return locationProductRepository.findByProductIdAndLocationId(productId, locationId)
                .orElseThrow(() -> new EntityNotFoundException("Product is not assigned to this location"));
    }

    private Location activeLocation(Long locationId) {
        return locationRepository.findById(locationId)
                .filter(l -> Boolean.TRUE.equals(l.getActive()))
                .orElseThrow(() -> new EntityNotFoundException("Location not found"));
    }

    private void requireActiveLocation(Long locationId) {
        activeLocation(locationId);
    }

    private User actor(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("authentication_required");
        }
        return userService.findByPhone(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("authentication_required"));
    }

    private void requireLocation(User actor, Long locationId) {
        if (locationId == null) throw new IllegalArgumentException("locationId is required");
        activeLocation(locationId);
        locationAccessService.requireNonKitchenAdmin(actor, locationId);
        locationAccessService.requireLocationAccess(actor, locationId);
    }

    private String normalizeVariant(String value) {
        return value == null || value.isBlank() ? "DEFAULT" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException("Image must be non-empty and no larger than 5 MB");
        }
        String type = file.getContentType();
        if (type == null || !IMAGE_TYPES.contains(type.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Only JPEG, PNG and WEBP images are supported");
        }
        try {
            if (ImageIO.read(file.getInputStream()) == null) {
                throw new IllegalArgumentException("Invalid image content");
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Invalid image content");
        }
    }
}
