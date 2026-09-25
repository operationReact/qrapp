package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final MenuRepository     menuRepository;
    private final LocationRepository locationRepository;
    private final LocationAccessService locationAccessService;

    @Cacheable(cacheNames = "categories", key = "#locationId", sync = true)
    public List<Category> getAllCategories(Long locationId) {
        requireActiveLocation(locationId);
        return categoryRepository.findByLocationIdAndIsDeletedFalse(locationId);
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
                    return categoryRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));
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
