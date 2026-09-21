package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.service.CategoryService;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final MenuRepository menuRepository;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Category>> getAllCategories(@RequestParam Long locationId) {
        List<Category> categories = categoryService.getAllCategories(locationId);
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Category> getCategoryById(@PathVariable Long id, @RequestParam Long locationId) {
        return categoryService.getCategoryById(locationId, id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<List<MenuItem>> getMenuItemsByCategory(
            @PathVariable Long id, @RequestParam Long locationId) {
        // Verify category exists
        if (!categoryService.getCategoryById(locationId, id).isPresent()) {
            return ResponseEntity.notFound().build();
        }

        // Get all menu items for this category
        List<MenuItem> items = menuRepository.findByCategoryId(locationId, id);
        return ResponseEntity.ok(items);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<Category> createCategory(
            @RequestParam Long locationId,
            @Valid @RequestBody Category category,
            Authentication authentication) {
        category.setId(null);
        Category saved = categoryService.createCategory(locationId, category, currentUser(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<Category> updateCategory(
            @PathVariable Long id,
            @RequestParam Long locationId,
            @Valid @RequestBody Category category,
            Authentication authentication) {
        try {
            Category updated = categoryService.updateCategory(locationId, id, category, currentUser(authentication));
            return ResponseEntity.ok(updated);
        } catch (RuntimeException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<?> deleteCategory(
            @PathVariable Long id,
            @RequestParam Long locationId,
            Authentication authentication) {
        if (!categoryService.getCategoryById(locationId, id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        categoryService.deleteCategory(locationId, id, currentUser(authentication));
        return ResponseEntity.noContent().build();
    }

    private com.broandbro.qrapp.entity.User currentUser(Authentication authentication) {
        return userService.findByPhone(authentication.getName()).orElseThrow();
    }
}


