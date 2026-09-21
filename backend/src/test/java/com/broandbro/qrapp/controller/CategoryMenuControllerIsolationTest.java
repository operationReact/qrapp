package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.service.CategoryService;
import com.broandbro.qrapp.service.UserService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class CategoryMenuControllerIsolationTest {

    @Test
    void categoryListAndGetUseTheRequestedLocation() {
        CategoryService categories = mock(CategoryService.class);
        Category item = new Category();
        item.setId(10L);
        item.setName("Biryani");
        when(categories.getAllCategories(1L)).thenReturn(List.of(item));
        when(categories.getCategoryById(1L, 10L)).thenReturn(Optional.of(item));
        CategoryController controller = new CategoryController(
                categories, mock(com.broandbro.qrapp.repository.MenuRepository.class),
                mock(UserService.class));

        assertThat(controller.getAllCategories(1L).getBody()).containsExactly(item);
        assertThat(controller.getCategoryById(10L, 1L).getBody()).isEqualTo(item);
        verify(categories).getAllCategories(1L);
        verify(categories).getCategoryById(1L, 10L);
        verify(categories, never()).getAllCategories(2L);
        verify(categories, never()).getCategoryById(2L, 10L);
    }

    @Test
    void crossLocationCategoryGetReturnsNotFound() {
        CategoryService categories = mock(CategoryService.class);
        when(categories.getCategoryById(2L, 10L)).thenReturn(Optional.empty());
        CategoryController controller = new CategoryController(
                categories, mock(com.broandbro.qrapp.repository.MenuRepository.class),
                mock(UserService.class));

        assertThat(controller.getCategoryById(10L, 2L).getStatusCode().value()).isEqualTo(404);
    }
}
