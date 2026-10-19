package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.ProductImageAsset;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.exception.InvalidImageException;
import com.broandbro.qrapp.prompt.CategoryImagePromptBuilder;
import com.broandbro.qrapp.prompt.FoodImagePromptBuilder;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.ProductImageAssetRepository;
import com.broandbro.qrapp.service.ai.ImageGenerationService;
import com.broandbro.qrapp.storage.ImageStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CategoryImageAssetTest {

    private final Location pragati = Location.builder().id(1L).name("Pragati Nagar").code("PRAGATI").active(true).build();
    private final Location towers = Location.builder().id(2L).name("Meenakshi Towers").code("TOWERS").active(true).build();

    private final CategoryRepository categories = mock(CategoryRepository.class);
    private final LocationRepository locations = mock(LocationRepository.class);
    private final LocationAccessService access = mock(LocationAccessService.class);
    private final ProductImageAssetRepository assets = mock(ProductImageAssetRepository.class);
    private final ImageStorageService storage = mock(ImageStorageService.class);
    private final User user = mock(User.class);

    private final CategoryService service = new CategoryService(
            categories, mock(MenuRepository.class), locations, access, storage,
            mock(ImageGenerationService.class), mock(FoodImagePromptBuilder.class),
            mock(CategoryImagePromptBuilder.class), assets,
            mock(com.broandbro.qrapp.repository.LocationProductRepository.class),
            mock(com.broandbro.qrapp.repository.ProductRepository.class));

    @Test
    void imageSourcesListsSameNamedMrpCategoriesOnlyFromOtherAccessibleLocations() {
        Category target = category(10L, "Biryani", pragati, CategoryService.MRP_PRODUCT_CATEGORY);
        Category source = category(20L, "Biryani", towers, CategoryService.MRP_PRODUCT_CATEGORY);
        when(locations.findById(1L)).thenReturn(Optional.of(pragati));
        when(categories.findByIdAndLocationIdAndIsDeletedFalse(10L, 1L)).thenReturn(Optional.of(target));
        when(access.getAccessibleLocations(user)).thenReturn(List.of(pragati, towers));
        when(categories.findImageSourcesByName("Biryani", CategoryService.MRP_PRODUCT_CATEGORY, List.of(2L)))
                .thenReturn(List.of(source));

        assertThat(service.imageSources(1L, 10L, user))
                .singleElement()
                .satisfies(item -> {
                    assertThat(item.categoryId()).isEqualTo(20L);
                    assertThat(item.locationId()).isEqualTo(2L);
                });
    }

    @Test
    void reuseRejectsSourceThatHasNoSharedImageYet() {
        Category target = category(10L, "Biryani", pragati, CategoryService.MRP_PRODUCT_CATEGORY);
        Category legacySource = category(20L, "Biryani", towers, CategoryService.MRP_PRODUCT_CATEGORY);
        legacySource.setImageUrl("https://cdn.example/legacy.png");
        legacySource.setImageKey("categories/20/legacy.png");
        when(locations.findById(1L)).thenReturn(Optional.of(pragati));
        when(locations.findById(2L)).thenReturn(Optional.of(towers));
        when(categories.findByIdAndLocationIdAndIsDeletedFalse(10L, 1L)).thenReturn(Optional.of(target));
        when(categories.findById(20L)).thenReturn(Optional.of(legacySource));

        assertThatThrownBy(() -> service.reuseCategoryImage(1L, 10L, 20L, user))
                .isInstanceOf(InvalidImageException.class)
                .hasMessageContaining("Re-upload it once");
        verify(assets, never()).findByIdForUpdate(anyLong());
    }

    @Test
    void uploadingIdenticalBytesReusesExistingAssetWithoutStoringAgain() {
        Category target = category(10L, "Biryani", pragati, CategoryService.MRP_PRODUCT_CATEGORY);
        ProductImageAsset asset = new ProductImageAsset();
        asset.setId(5L);
        asset.setImageUrl("https://cdn.example/shared.png");
        asset.setImageKey("categories/assets/shared.png");
        asset.setContentType("image/png");
        asset.setSizeBytes(3);
        asset.setRefCount(1);
        MockMultipartFile file = new MockMultipartFile("image", "biryani.png", "image/png", new byte[] {1, 2, 3});
        when(locations.findById(1L)).thenReturn(Optional.of(pragati));
        when(categories.findByIdAndLocationIdAndIsDeletedFalse(10L, 1L)).thenReturn(Optional.of(target));
        when(categories.save(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(assets.findByContentSha256(anyString())).thenReturn(Optional.of(asset));
        when(assets.findByIdForUpdate(5L)).thenReturn(Optional.of(asset));

        Category saved = service.uploadCategoryImage(1L, 10L, file, user);

        verify(storage, never()).uploadImageWithKey(any(), anyString(), anyString());
        assertThat(saved.getImageAsset()).isSameAs(asset);
        assertThat(saved.getImageUrl()).isEqualTo("https://cdn.example/shared.png");
        assertThat(asset.getRefCount()).isEqualTo(2);
    }

    private static Category category(Long id, String name, Location location, String type) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        category.setLocation(location);
        category.setCategoryType(type);
        return category;
    }
}
