package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.MenuItemImage;
import com.broandbro.qrapp.entity.Product;
import com.broandbro.qrapp.controller.MenuController;
import com.broandbro.qrapp.analytics.repository.MenuItemAnalyticsRepository;
import com.broandbro.qrapp.dto.MenuItemResponse;
import com.broandbro.qrapp.enums.StockStatus;
import com.broandbro.qrapp.enums.ProductType;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.MenuItemImageRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.TagRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.context.ApplicationEventPublisher;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class MenuCategoryImageLocationIsolationTest {

    private final Location pragati = Location.builder().id(1L).name("Pragati Nagar")
            .code("PRAGATI_NAGAR").active(true).build();
    private final Location towers = Location.builder().id(2L).name("Meenakshi Towers")
            .code("MEENAKSHI_TOWERS").active(true).build();

    @Test
    void categoryListAndSameNameLookupAreScopedByLocation() {
        CategoryRepository categories = mock(CategoryRepository.class);
        LocationRepository locations = mock(LocationRepository.class);
        when(locations.findById(1L)).thenReturn(Optional.of(pragati));
        when(categories.findByLocationIdAndCategoryTypeAndIsDeletedFalseOrderByDisplayOrderAscNameAsc(1L, "MENU"))
                .thenReturn(List.of(category(10L, "Biryani", pragati)));
        when(categories.findByLocationIdAndNameAndIsDeletedFalse(1L, "Biryani"))
                .thenReturn(Optional.of(category(10L, "Biryani", pragati)));

        CategoryService service = new CategoryService(
                categories, mock(MenuRepository.class), locations, mock(LocationAccessService.class),
                mock(com.broandbro.qrapp.storage.ImageStorageService.class),
                mock(com.broandbro.qrapp.service.ai.ImageGenerationService.class),
                mock(com.broandbro.qrapp.prompt.FoodImagePromptBuilder.class),
                mock(com.broandbro.qrapp.prompt.CategoryImagePromptBuilder.class),
                mock(com.broandbro.qrapp.repository.ProductImageAssetRepository.class));

        assertThat(service.getAllCategories(1L)).extracting(Category::getLocation)
                .containsOnly(pragati);
        assertThat(service.getCategoryByName(1L, "Biryani")).get()
                .extracting(Category::getLocation).isEqualTo(pragati);
        verify(categories, never()).findByLocationIdAndIsDeletedFalse(2L);
    }

    @Test
    void categoryGetFromAnotherLocationIsNotFound() {
        CategoryRepository categories = mock(CategoryRepository.class);
        LocationRepository locations = mock(LocationRepository.class);
        when(locations.findById(2L)).thenReturn(Optional.of(towers));
        when(categories.findByIdAndLocationIdAndIsDeletedFalse(10L, 2L))
                .thenReturn(Optional.empty());

        CategoryService service = new CategoryService(
                categories, mock(MenuRepository.class), locations, mock(LocationAccessService.class),
                mock(com.broandbro.qrapp.storage.ImageStorageService.class),
                mock(com.broandbro.qrapp.service.ai.ImageGenerationService.class),
                mock(com.broandbro.qrapp.prompt.FoodImagePromptBuilder.class),
                mock(com.broandbro.qrapp.prompt.CategoryImagePromptBuilder.class),
                mock(com.broandbro.qrapp.repository.ProductImageAssetRepository.class));

        assertThat(service.getCategoryById(2L, 10L)).isEmpty();
    }

    @Test
    void menuListReturnsOnlyItemsFromRequestedLocation() {
        MenuRepository menus = mock(MenuRepository.class);
        LocationRepository locations = mock(LocationRepository.class);
        PricingService pricing = mock(PricingService.class);
        InventoryService inventory = mock(InventoryService.class);
        when(locations.findById(pragati.getId())).thenReturn(Optional.of(pragati));
        MenuItem pragatiItem = menuItem(20L, pragati);
        when(menus.findByFilters(eq(pragati.getId()), isNull(), isNull(), isNull(), any()))
                .thenReturn(List.of(pragatiItem));
        when(pricing.getCurrentSellingPrices(List.of(20L)))
                .thenReturn(Map.of(20L, BigDecimal.TEN));
        when(inventory.getAvailability(List.of(pragatiItem)))
                .thenReturn(Map.of(20L, new InventoryService.MenuItemAvailability(
                        true, StockStatus.AVAILABLE)));

        MenuController controller = new MenuController(
                menus, mock(CategoryRepository.class), mock(TagRepository.class), inventory,
                pricing, mock(ApplicationEventPublisher.class),
                mock(MenuItemAnalyticsRepository.class), locations,
                mock(LocationAccessService.class), mock(UserService.class));

        assertThat(controller.getMenu(pragati.getId(), null, null, null, 0, 200))
                .extracting(MenuItemResponse::getId).containsExactly(20L);
        verify(menus).findByFilters(eq(pragati.getId()), isNull(), isNull(), isNull(), any());
        verify(menus, never()).findByFilters(eq(towers.getId()), any(), any(), any(), any());
    }

    @Test
    void retailMenuUsesMenuItemIdButCatalogMasterFieldsAndLocationPrice() {
        MenuRepository menus = mock(MenuRepository.class);
        LocationRepository locations = mock(LocationRepository.class);
        PricingService pricing = mock(PricingService.class);
        InventoryService inventory = mock(InventoryService.class);
        when(locations.findById(pragati.getId())).thenReturn(Optional.of(pragati));

        Product catalogProduct = new Product();
        catalogProduct.setId(900L);
        catalogProduct.setName("Catalog Soap");
        catalogProduct.setDescription("Authoritative description");
        catalogProduct.setMrp(new BigDecimal("50"));
        catalogProduct.setImageUrl("/catalog/soap.png");

        MenuItem projection = menuItem(20L, pragati);
        projection.setProductType(ProductType.RETAIL_PRODUCT);
        projection.setCatalogProduct(catalogProduct);
        projection.setName("Stale projection name");
        projection.setMrp(new BigDecimal("99"));
        projection.setImageUrl("/legacy/stale.png");
        when(menus.findVisibleByLocationAndProductType(eq(pragati.getId()), eq(ProductType.RETAIL_PRODUCT), any()))
                .thenReturn(List.of(projection));
        when(pricing.getCurrentSellingPrices(List.of(20L)))
                .thenReturn(Map.of(20L, new BigDecimal("42")));
        when(inventory.getAvailability(List.of(projection)))
                .thenReturn(Map.of(20L, new InventoryService.MenuItemAvailability(true, StockStatus.AVAILABLE)));

        MenuController controller = new MenuController(
                menus, mock(CategoryRepository.class), mock(TagRepository.class), inventory,
                pricing, mock(ApplicationEventPublisher.class),
                mock(MenuItemAnalyticsRepository.class), locations,
                mock(LocationAccessService.class), mock(UserService.class));

        List<MenuItemResponse> result = controller.getRetailMenu(pragati.getId(), 200);

        assertThat(result).singleElement().satisfies(item -> {
            assertThat(item.getId()).isEqualTo(20L);
            assertThat(item.getId()).isNotEqualTo(catalogProduct.getId());
            assertThat(item.getName()).isEqualTo("Catalog Soap");
            assertThat(item.getMrp()).isEqualByComparingTo("50");
            assertThat(item.getImageUrl()).isEqualTo("/catalog/soap.png");
            assertThat(item.getPrice()).isEqualByComparingTo("42");
        });
    }

    @Test
    void imageDeleteRejectsMenuItemFromAnotherLocation() {
        MenuItemImageRepository images = mock(MenuItemImageRepository.class);
        MenuItem item = menuItem(20L, towers);
        MenuItemImage image = new MenuItemImage();
        image.setId(30L);
        image.setMenuItem(item);
        when(images.findByIdAndMenuItemLocationId(30L, pragati.getId())).thenReturn(Optional.empty());

        MenuItemImageService service = new MenuItemImageService(images, mock(MenuRepository.class));

        assertThatThrownBy(() -> service.deleteImage(30L, pragati.getId()))
                .isInstanceOf(RuntimeException.class);
        verify(images, never()).delete(any());
    }

    @Test
    void imageUploadRejectsMenuItemFromAnotherLocation() {
        MenuRepository menus = mock(MenuRepository.class);
        when(menus.findByIdAndLocationId(20L, pragati.getId())).thenReturn(Optional.empty());
        MenuItemImageService service = new MenuItemImageService(
                mock(MenuItemImageRepository.class), menus);
        MockMultipartFile file = new MockMultipartFile(
                "file", "item.png", "image/png", new byte[] {1, 2, 3});

        assertThatThrownBy(() -> service.uploadOrReplaceImage(20L, pragati.getId(), file))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void imageUploadAcceptsMenuItemInRequestedLocation() throws Exception {
        MenuRepository menus = mock(MenuRepository.class);
        MenuItem item = menuItem(20L, pragati);
        when(menus.findByIdAndLocationId(20L, pragati.getId())).thenReturn(Optional.of(item));
        MenuItemImageRepository images = mock(MenuItemImageRepository.class);
        when(images.existsByMenuItemId(20L)).thenReturn(false);
        MenuItemImage saved = new MenuItemImage();
        saved.setId(30L);
        saved.setMenuItem(item);
        when(images.save(any(MenuItemImage.class))).thenReturn(saved);
        when(menus.save(item)).thenReturn(item);

        MenuItemImageService service = new MenuItemImageService(images, menus);
        BufferedImage source = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(source, "png", bytes);
        MockMultipartFile file = new MockMultipartFile(
                "file", "item.png", "image/png", bytes.toByteArray());

        assertThat(service.uploadOrReplaceImage(20L, pragati.getId(), file).getMenuItemId())
                .isEqualTo(20L);
        verify(images).save(any(MenuItemImage.class));
    }

    @Test
    void imageDeleteAcceptsImageOwnedByRequestedLocation() {
        MenuItemImageRepository images = mock(MenuItemImageRepository.class);
        MenuItemImage image = new MenuItemImage();
        image.setId(30L);
        image.setMenuItem(menuItem(20L, pragati));
        when(images.findByIdAndMenuItemLocationId(30L, pragati.getId()))
                .thenReturn(Optional.of(image));

        new MenuItemImageService(images, mock(MenuRepository.class))
                .deleteImage(30L, pragati.getId());

        verify(images).delete(image);
    }

    private static Category category(Long id, String name, Location location) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        category.setLocation(location);
        return category;
    }

    private static MenuItem menuItem(Long id, Location location) {
        MenuItem item = new MenuItem();
        item.setId(id);
        item.setName("Item " + id);
        item.setLocation(location);
        return item;
    }
}
