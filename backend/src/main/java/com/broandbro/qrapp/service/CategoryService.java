package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.exception.FileTooLargeException;
import com.broandbro.qrapp.exception.InvalidImageException;
import com.broandbro.qrapp.prompt.FoodImagePromptBuilder;
import com.broandbro.qrapp.prompt.CategoryImagePromptBuilder;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.service.ai.ImageGenerationService;
import com.broandbro.qrapp.storage.ImageStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.broandbro.qrapp.prompt.CategoryImageQuality;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
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

    private final CategoryRepository categoryRepository;
    private final MenuRepository     menuRepository;
    private final LocationRepository locationRepository;
    private final LocationAccessService locationAccessService;
    private final ImageStorageService imageStorage;
    private final ImageGenerationService imageGenerationService;
    private final FoodImagePromptBuilder promptBuilder;
    private final CategoryImagePromptBuilder categoryPromptBuilder;

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
        String folder = "categories/" + category.getId();
        ImageStorageService.StoredImage stored;
        try {
            String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
            stored = imageStorage.uploadImageWithKey(file.getBytes(), folder, contentType);
        } catch (IOException e) {
            throw new InvalidImageException("Could not read category image");
        }
        deleteExistingImage(category);
        category.setImageUrl(stored.url());
        category.setImageKey(stored.key());
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
        if (category.getImageKey() != null) {
            imageStorage.deleteLocationImageByKey(category.getImageKey());
        } else if (category.getImageUrl() != null) {
            imageStorage.deleteImageByUrl(category.getImageUrl());
        }
    }

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
