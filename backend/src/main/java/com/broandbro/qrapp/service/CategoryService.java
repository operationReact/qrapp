package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.LocationProduct;
import com.broandbro.qrapp.entity.ProductImageAsset;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.exception.FileTooLargeException;
import com.broandbro.qrapp.exception.InvalidImageException;
import com.broandbro.qrapp.prompt.FoodImagePromptBuilder;
import com.broandbro.qrapp.prompt.CategoryImagePromptBuilder;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.LocationProductRepository;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.ProductImageAssetRepository;
import com.broandbro.qrapp.repository.ProductRepository;
import com.broandbro.qrapp.service.ai.ImageGenerationService;
import com.broandbro.qrapp.storage.ImageStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.broandbro.qrapp.prompt.CategoryImageQuality;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryService {

    public static final String MENU_CATEGORY = "MENU";
    public static final String MRP_PRODUCT_CATEGORY = "MRP_PRODUCT";

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024L;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final java.util.regex.Pattern CATEGORY_VIDEO_KEY_PATTERN =
            java.util.regex.Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]{0,200}\\.mp4$");

    private final CategoryRepository categoryRepository;
    private final MenuRepository     menuRepository;
    private final LocationRepository locationRepository;
    private final LocationAccessService locationAccessService;
    private final ImageStorageService imageStorage;
    private final ImageGenerationService imageGenerationService;
    private final FoodImagePromptBuilder promptBuilder;
    private final CategoryImagePromptBuilder categoryPromptBuilder;
    private final ProductImageAssetRepository imageAssetRepository;
    private final LocationProductRepository locationProductRepository;
    private final ProductRepository productRepository;

    @Cacheable(cacheNames = "categories", key = "#locationId", sync = true)
    public List<Category> getAllCategories(Long locationId) {
        requireActiveLocation(locationId);
        return categoryRepository.findByLocationIdAndCategoryTypeAndIsDeletedFalseOrderByDisplayOrderAscNameAsc(
                locationId, MENU_CATEGORY);
    }

    @Transactional(readOnly = true)
    public List<Category> getAllMrpProductCategories(Long locationId) {
        requireActiveLocation(locationId);
        return categoryRepository.findByLocationIdAndCategoryTypeAndIsDeletedFalseOrderByDisplayOrderAscNameAsc(
                locationId, MRP_PRODUCT_CATEGORY);
    }

    public Optional<Category> getCategoryById(Long locationId, Long id) {
        requireActiveLocation(locationId);
        return categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(id, locationId);
    }

    public Optional<Category> getCategoryByName(Long locationId, String name) {
        requireActiveLocation(locationId);
        return categoryRepository.findByLocationIdAndNameAndIsDeletedFalse(locationId, name);
    }

    @CacheEvict(cacheNames = {"categories", "menu", "menuRecommended"}, allEntries = true)
    public Category createCategory(Long locationId, Category category, User user) {
        Location location = requireManagementLocation(locationId, user);
        category.setCategoryType(MENU_CATEGORY);
        category.setLocation(location);
        return categoryRepository.save(category);
    }

    @Transactional
    @CacheEvict(cacheNames = {"categories", "menu", "menuRecommended"}, allEntries = true)
    public Category createMrpProductCategory(Long locationId, Category category, User user) {
        Location location = requireManagementLocation(locationId, user);
        category.setCategoryType(MRP_PRODUCT_CATEGORY);
        category.setLocation(location);
        return categoryRepository.save(category);
    }

    @Transactional
    @CacheEvict(cacheNames = {"categories", "menu", "menuRecommended"}, allEntries = true)
    public Category renameMrpProductCategory(Long locationId, Long id, String newName, User user) {
        requireManagementLocation(locationId, user);
        String name = newName == null ? "" : newName.trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Category name is required");
        }
        Category category = categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(id, locationId)
                .filter(existing -> MRP_PRODUCT_CATEGORY.equals(existing.getCategoryType()))
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));
        boolean nameTaken = categoryRepository.findByLocationIdAndNameAndCategoryTypeAndIsDeletedFalse(
                        locationId, name, MRP_PRODUCT_CATEGORY)
                .filter(other -> !other.getId().equals(id))
                .isPresent();
        if (nameTaken) {
            throw new IllegalArgumentException("A product category named \"" + name + "\" already exists");
        }
        String oldName = category.getName();
        category.setName(name);
        Category saved = categoryRepository.save(category);
        // Products store their category by name; keep this location's products aligned so the next catalog sync
        // doesn't recreate the old category. Menu projections reference the Category row and update automatically.
        locationProductRepository.findByLocationIdOrderByProductNameAsc(locationId).stream()
                .map(LocationProduct::getProduct)
                .filter(product -> oldName.equals(product.getCategoryName()))
                .distinct()
                .forEach(product -> {
                    product.setCategoryName(name);
                    productRepository.save(product);
                });
        return saved;
    }

    @CacheEvict(cacheNames = {"categories", "menu", "menuRecommended"}, allEntries = true)
    public Category updateCategory(Long locationId, Long id, Category category, User user) {
        requireManagementLocation(locationId, user);
        return categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(id, locationId)
                .map(existing -> {
                    if (category.getName() != null) existing.setName(category.getName());
                    if (category.getDescription() != null) existing.setDescription(category.getDescription());
                    if (category.getDisplayOrder() != null) existing.setDisplayOrder(category.getDisplayOrder());
                    return categoryRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));
    }

    @Transactional
    @CacheEvict(cacheNames = "categories", allEntries = true)
    public Category reorderCategory(Long locationId, Long id, int displayOrder, User user) {
        requireManagementLocation(locationId, user);
        Category category = categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(id, locationId)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));
        category.setDisplayOrder(displayOrder);
        return categoryRepository.save(category);
    }

    // ── Category image management (manual upload + admin-accepted AI) ──────────

    @Transactional
    @CacheEvict(cacheNames = "categories", allEntries = true)
    public Category uploadCategoryImage(Long locationId, Long id, MultipartFile file, User user) {
        validateImage(file);
        requireManagementLocation(locationId, user);
        Category category = categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(id, locationId)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));
        byte[] raw;
        try {
            raw = file.getBytes();
        } catch (IOException e) {
            throw new InvalidImageException("Could not read category image");
        }
        String contentType = file.getContentType().toLowerCase(Locale.ROOT);
        attachImageAsset(category, findOrStoreImageAsset(raw, contentType));
        category.setAiGeneratedImage(false);
        return categoryRepository.save(category);
    }

    /**
     * Lists active categories of the same type and name in other locations the user can
     * manage, so an admin can reuse their image instead of uploading a duplicate.
     */
    @Transactional(readOnly = true)
    public List<CategoryImageSource> imageSources(Long locationId, Long id, User user) {
        requireManagementLocation(locationId, user);
        Category category = categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(id, locationId)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));
        List<Long> otherLocations = locationAccessService.getAccessibleLocations(user).stream()
                .map(Location::getId)
                .filter(candidate -> !candidate.equals(locationId))
                .toList();
        if (otherLocations.isEmpty()) return List.of();
        return categoryRepository.findImageSourcesByName(category.getName(), category.getCategoryType(), otherLocations)
                .stream()
                .map(source -> new CategoryImageSource(source.getId(), source.getName(),
                        source.getLocation().getId(), source.getLocation().getName(), source.getImageUrl()))
                .toList();
    }

    /**
     * Points a category at the image asset of another category. Both share one stored
     * object; it is released only when no product or category references it.
     */
    @Transactional
    @CacheEvict(cacheNames = "categories", allEntries = true)
    public Category reuseCategoryImage(Long locationId, Long id, Long sourceCategoryId, User user) {
        requireManagementLocation(locationId, user);
        Category category = categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(id, locationId)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));
        if (Objects.equals(category.getId(), sourceCategoryId)) {
            throw new IllegalArgumentException("Choose a different category to reuse the image from");
        }
        Category source = categoryRepository.findById(sourceCategoryId)
                .filter(candidate -> !Boolean.TRUE.equals(candidate.getIsDeleted()))
                .orElseThrow(() -> new RuntimeException("Source category not found: " + sourceCategoryId));
        requireManagementLocation(source.getLocation().getId(), user);
        if (!Objects.equals(category.getCategoryType(), source.getCategoryType())) {
            throw new IllegalArgumentException("Images can only be reused between categories of the same type");
        }
        ProductImageAsset asset = source.getImageAsset();
        if (asset == null) {
            throw new InvalidImageException("This image cannot be shared yet. Re-upload it once to make it reusable.");
        }
        attachImageAsset(category, asset);
        category.setAiGeneratedImage(false);
        return categoryRepository.save(category);
    }

    @Transactional
    @CacheEvict(cacheNames = "categories", allEntries = true)
    public Category removeCategoryImage(Long locationId, Long id, User user) {
        requireManagementLocation(locationId, user);
        Category category = categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(id, locationId)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));
        deleteExistingImage(category);
        category.setImageUrl(null);
        category.setImageKey(null);
        category.setAiGeneratedImage(false);
        return categoryRepository.save(category);
    }

    /**
     * Assigns (or clears, when blank) a bundled 1:1 3-second video to an MRP product category.
     * The file itself lives in the frontend bundle, so only its file name format is validated here.
     */
    @Transactional
    @CacheEvict(cacheNames = "categories", allEntries = true)
    public Category setMrpProductCategoryVideo(Long locationId, Long id, String videoKey, User user) {
        requireManagementLocation(locationId, user);
        Category category = categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(id, locationId)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));
        if (!MRP_PRODUCT_CATEGORY.equals(category.getCategoryType())) {
            throw new IllegalArgumentException("Videos can only be assigned to product categories");
        }
        String normalized = videoKey == null ? null : videoKey.trim();
        if (normalized != null && normalized.isEmpty()) {
            normalized = null;
        }
        if (normalized != null && !CATEGORY_VIDEO_KEY_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("Invalid video file name: " + normalized);
        }
        category.setVideoKey(normalized);
        return categoryRepository.save(category);
    }

    /**
     * Synchronously generates a single AI image option for the admin to preview.
     * Nothing is persisted on the category until {@link #applyGeneratedImage} is
     * explicitly called — generation happens once per accepted image, never at
     * customer request time.
     */
    public CategoryImageOption generateImageOption(Long locationId, Long id, String additionalPrompt, User user) {
        requireManagementLocation(locationId, user);
        Category category = categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(id, locationId)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));

        String categoryName = category.getName();
        String prompt = categoryPromptBuilder.buildCategoryFoodImagePrompt(categoryName, category.getDescription(), additionalPrompt);
        byte[] imageBytes = imageGenerationService.generateFoodImage(categoryName, categoryName, null, null, additionalPrompt);

        String folder = "categories/" + category.getId() + "/ai";
        ImageStorageService.StoredImage stored = imageStorage.uploadImageWithKey(imageBytes, folder, "image/jpeg");

        return new CategoryImageOption(category.getId(), stored.url(), prompt);
    }

    @Transactional
    @CacheEvict(cacheNames = "categories", allEntries = true)
    public Category applyGeneratedImage(Long locationId, Long id, String imageUrl, String previousGeneratedUrl, User user) {
        requireManagementLocation(locationId, user);
        Category category = categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(id, locationId)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));

        deleteExistingImage(category);
        if (previousGeneratedUrl != null && !previousGeneratedUrl.equals(imageUrl)) {
            try {
                imageStorage.deleteImageByUrl(previousGeneratedUrl);
            } catch (Exception e) {
                log.warn("Failed to delete discarded AI-generated category image {}: {}", previousGeneratedUrl, e.getMessage());
            }
        }

        category.setImageUrl(imageUrl);
        category.setImageKey(null);
        category.setAiGeneratedImage(true);
        return categoryRepository.save(category);
    }

    /** Preview-only result of a single AI category-image generation request. */
    public record CategoryImageOption(Long categoryId, String imageUrl, String prompt) {}

    private void deleteExistingImage(Category category) {
        ProductImageAsset asset = category.getImageAsset();
        if (asset != null) {
            category.setImageAsset(null);
            releaseImageAsset(asset);
        } else if (category.getImageKey() != null) {
            imageStorage.deleteLocationImageByKey(category.getImageKey());
        } else if (category.getImageUrl() != null) {
            imageStorage.deleteImageByUrl(category.getImageUrl());
        }
    }

    private ProductImageAsset findOrStoreImageAsset(byte[] raw, String contentType) {
        String sha256 = sha256Hex(raw);
        return imageAssetRepository.findByContentSha256(sha256).orElseGet(() -> {
            ImageStorageService.StoredImage stored = imageStorage.uploadImageWithKey(raw, "categories/assets", contentType);
            ProductImageAsset asset = new ProductImageAsset();
            asset.setContentSha256(sha256);
            asset.setImageUrl(stored.url());
            asset.setImageKey(stored.key());
            asset.setContentType(contentType);
            asset.setSizeBytes(raw.length);
            asset.setRefCount(0);
            return imageAssetRepository.save(asset);
        });
    }

    /** Points the category at {@code requested}, adjusting ref counts and releasing the previous image. */
    private void attachImageAsset(Category category, ProductImageAsset requested) {
        ProductImageAsset next = imageAssetRepository.findByIdForUpdate(requested.getId())
                .orElseThrow(() -> new IllegalStateException("Image asset not found"));
        ProductImageAsset previous = category.getImageAsset();
        String previousKey = category.getImageKey();
        String previousUrl = category.getImageUrl();
        boolean unchanged = previous != null && Objects.equals(previous.getId(), next.getId());
        if (!unchanged) {
            next.setRefCount(next.getRefCount() + 1);
            imageAssetRepository.save(next);
        }
        category.setImageAsset(next);
        category.setImageUrl(next.getImageUrl());
        category.setImageKey(next.getImageKey());
        if (unchanged) return;
        if (previous != null) {
            releaseImageAsset(previous);
        } else if (previousKey != null) {
            imageStorage.deleteLocationImageByKey(previousKey);
        } else if (previousUrl != null && !previousUrl.isBlank()) {
            imageStorage.deleteImageByUrl(previousUrl);
        }
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
        runAfterCommit(() -> imageStorage.deleteImageByKey(key));
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

    /** A same-named category in another location that already has a shared image. */
    public record CategoryImageSource(Long categoryId, String name, Long locationId, String locationName, String imageUrl) {}

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidImageException("Image must not be empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new FileTooLargeException("Image size exceeds maximum allowed 5 MB");
        }
        String contentType = file.getContentType();
        String name = file.getOriginalFilename();
        String extension = name == null || !name.contains(".")
                ? "" : name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        boolean matches = contentType != null && (
                (contentType.equalsIgnoreCase("image/jpeg") && Set.of("jpg", "jpeg").contains(extension))
                        || (contentType.equalsIgnoreCase("image/png") && extension.equals("png"))
                        || (contentType.equalsIgnoreCase("image/webp") && extension.equals("webp")));
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase(Locale.ROOT))
                || !ALLOWED_EXTENSIONS.contains(extension) || !matches) {
            throw new InvalidImageException("Invalid image type. Allowed: JPG, JPEG, PNG, WEBP");
        }
    }

    @Transactional
    @CacheEvict(cacheNames = {"categories", "menu", "menuRecommended"}, allEntries = true)
    public void deleteCategory(Long locationId, Long id, User user) {
        requireManagementLocation(locationId, user);
        Category category = categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(id, locationId)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));

        // Cascade soft-delete — load once, mark all, save in one batch
        var items = menuRepository.findByCategoryId(locationId, id);
        items.forEach(item -> item.setIsDeleted(true));
        menuRepository.saveAll(items);

        category.setIsDeleted(true);
        categoryRepository.save(category);
    }

    public List<Category> getDeletedCategories(Long locationId, User user) {
        requireManagementLocation(locationId, user);
        return categoryRepository.findByLocationIdAndIsDeletedTrue(locationId);
    }

    @Transactional
    @CacheEvict(cacheNames = {"categories", "menu", "menuRecommended"}, allEntries = true)
    public void restoreCategory(Long locationId, Long id, User user) {
        requireManagementLocation(locationId, user);
        Category category = categoryRepository.findByIdAndLocationIdAndIsDeletedTrue(id, locationId)
                .orElseThrow(() -> new RuntimeException("Deleted category not found: " + id));

        // Restore the category
        category.setIsDeleted(false);
        categoryRepository.save(category);

        // Restore menu items that were cascade-deleted with this category
        var items = menuRepository.findByLocationIdAndCategoryIdAndIsDeletedTrue(locationId, id);
        items.forEach(item -> item.setIsDeleted(false));
        menuRepository.saveAll(items);
    }

    private Location requireActiveLocation(Long locationId) {
        return locationRepository.findById(locationId)
                .filter(location -> Boolean.TRUE.equals(location.getActive()))
                .orElseThrow(() -> new IllegalArgumentException("location_not_found_or_inactive"));
    }

    private Location requireManagementLocation(Long locationId, User user) {
        Location location = requireActiveLocation(locationId);
        locationAccessService.requireLocationAccess(user, locationId);
        return location;
    }
}
