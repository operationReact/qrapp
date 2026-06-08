package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final MenuRepository     menuRepository;

    public List<Category> getAllCategories() {
        return categoryRepository.findByIsDeletedFalse();
    }

    public Optional<Category> getCategoryById(Long id) {
        return categoryRepository.findByIdAndIsDeletedFalse(id);
    }

    public Optional<Category> getCategoryByName(String name) {
        return categoryRepository.findByNameAndIsDeletedFalse(name);
    }

    public Category createCategory(Category category) {
        return categoryRepository.save(category);
    }

    public Category updateCategory(Long id, Category category) {
        return categoryRepository.findByIdAndIsDeletedFalse(id)
                .map(existing -> {
                    if (category.getName() != null) existing.setName(category.getName());
                    if (category.getDescription() != null) existing.setDescription(category.getDescription());
                    return categoryRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));
    }

    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));

        // Cascade soft-delete — load once, mark all, save in one batch
        var items = menuRepository.findByCategoryId(id);
        items.forEach(item -> item.setIsDeleted(true));
        menuRepository.saveAll(items);

        category.setIsDeleted(true);
        categoryRepository.save(category);
    }

    public List<Category> getDeletedCategories() {
        return categoryRepository.findByIsDeletedTrue();
    }

    @Transactional
    public void restoreCategory(Long id) {
        Category category = categoryRepository.findByIdAndIsDeletedTrue(id)
                .orElseThrow(() -> new RuntimeException("Deleted category not found: " + id));

        // Restore the category
        category.setIsDeleted(false);
        categoryRepository.save(category);

        // Restore menu items that were cascade-deleted with this category
        var items = menuRepository.findByCategoryIdAndIsDeletedTrue(id);
        items.forEach(item -> item.setIsDeleted(false));
        menuRepository.saveAll(items);
    }
}
