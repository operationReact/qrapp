package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import com.broandbro.qrapp.storage.ImageStorageService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class ProductCatalogServiceTest {
    @Mock ProductRepository productRepository;
    @Mock LocationProductRepository locationProductRepository;
    @Mock ProductInventoryRepository inventoryRepository;
    @Mock ProductInventoryMovementRepository movementRepository;
    @Mock LocationRepository locationRepository;
    @Mock TaxProfileRepository taxProfileRepository;
    @Mock MenuRepository menuRepository;
    @Mock LocationAccessService locationAccessService;
    @Mock UserService userService;
    @Mock ImageStorageService imageStorageService;
    @Spy ProductImageEnhancer productImageEnhancer = new ProductImageEnhancer();
    @Mock TaxCalculationService taxCalculationService;
    @Mock Authentication authentication;
    @InjectMocks ProductCatalogService service;

    private User admin;
    private Location location;

    @BeforeEach
    void setUp() {
        admin = User.builder().id(7L).phone("9000000000").role(UserRole.ADMIN).isAdmin(true).build();
        location = Location.builder().id(11L).name("Test").code("TEST").active(true).build();
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(admin.getPhone());
        when(userService.findByPhone(admin.getPhone())).thenReturn(Optional.of(admin));
        lenient().when(locationRepository.findById(11L)).thenReturn(Optional.of(location));
    }

    @Test
    void rejectsProductWithoutLocation() {
        ProductRequest request = validRequest();
        request.setLocationId(null);

        assertThrows(IllegalArgumentException.class, () -> service.create(request, authentication));
        verify(productRepository, never()).save(any());
    }

    @Test
    void rejectsUnauthorizedLocationBeforeReadingCatalog() {
        doThrow(new AccessDeniedException("location_access_denied"))
                .when(locationAccessService).requireLocationAccess(admin, 11L);

        assertThrows(AccessDeniedException.class, () -> service.adminProducts(11L, authentication));
        verify(locationProductRepository, never()).findByLocationIdOrderByProductNameAsc(anyLong());
    }

    @Test
    void returnsLocationScopedSummaryWithoutReadingCatalogueRows() {
        ProductCatalogSummaryResponse expected = new ProductCatalogSummaryResponse(11L, 8L, 5L, 2L, 1L, 25.0);
        when(locationProductRepository.summarizeByLocationId(11L)).thenReturn(expected);

        ProductCatalogSummaryResponse actual = service.summary(11L, authentication);

        assertEquals(expected, actual);
        verify(locationAccessService).requireLocationAccess(admin, 11L);
        verify(locationProductRepository).summarizeByLocationId(11L);
        verify(locationProductRepository, never()).findByLocationIdOrderByProductNameAsc(anyLong());
    }

    @Test
    void rejectsNegativeStockAndLocksInventoryRow() {
        LocationProduct assignment = new LocationProduct();
        assignment.setId(44L);
        assignment.setLocation(location);
        Product product = new Product();
        product.setId(3L);
        product.setName("Soap");
        product.setSku("SOAP");
        assignment.setProduct(product);
        ProductInventory inventory = new ProductInventory();
        inventory.setAvailableQuantity(1L);
        when(locationProductRepository.findByProductIdAndLocationId(3L, 11L)).thenReturn(Optional.of(assignment));
        when(inventoryRepository.findByLocationProductIdForUpdate(44L)).thenReturn(Optional.of(inventory));

        ProductInventoryMovementRequest request = new ProductInventoryMovementRequest();
        request.setLocationId(11L);
        request.setMovementType("SALE");
        request.setQuantity(2L);
        request.setReason("Damaged stock");

        assertThrows(IllegalArgumentException.class, () -> service.recordMovement(3L, request, authentication));
        verify(inventoryRepository).findByLocationProductIdForUpdate(44L);
        verify(inventoryRepository, never()).save(any());
        verify(movementRepository, never()).save(any());
    }

    @Test
    void updatesExactStockAndRecordsCatalogueAdjustment() {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "menuRepository", null);
        Product product = new Product();
        product.setId(3L);
        product.setName("Soap");
        product.setActive(true);
        product.setMrp(new BigDecimal("40"));
        product.setCostPrice(new BigDecimal("20"));

        LocationProduct assignment = new LocationProduct();
        assignment.setId(44L);
        assignment.setProduct(product);
        assignment.setLocation(location);
        assignment.setVisible(true);
        assignment.setAvailable(true);

        ProductInventory inventory = new ProductInventory();
        inventory.setAvailableQuantity(4L);
        inventory.setLowStockThreshold(5L);

        when(productRepository.findById(3L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenReturn(product);
        when(locationProductRepository.findByProductIdAndLocationId(3L, 11L)).thenReturn(Optional.of(assignment));
        when(locationProductRepository.save(any(LocationProduct.class))).thenReturn(assignment);
        when(inventoryRepository.findByLocationProductId(44L)).thenReturn(Optional.of(inventory));
        when(taxCalculationService.calculateInclusive(any(), any()))
                .thenAnswer(invocation -> TaxCalculationService.TaxCalculationResult.zero(invocation.getArgument(0)));

        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setVariantIdentity("500g");
        request.setName("Soap");
        request.setMrp(new BigDecimal("40"));
        request.setCostPrice(new BigDecimal("20"));
        request.setLocationId(11L);
        request.setAvailableQuantity(10L);
        request.setLowStockThreshold(3L);

        service.update(3L, request, authentication);

        assertEquals(10L, inventory.getAvailableQuantity());
        assertEquals(3L, inventory.getLowStockThreshold());
        ArgumentCaptor<ProductInventoryMovement> movementCaptor =
                ArgumentCaptor.forClass(ProductInventoryMovement.class);
        verify(movementRepository).save(movementCaptor.capture());
        assertEquals("ADD_STOCK", movementCaptor.getValue().getMovementType());
        assertEquals(6L, movementCaptor.getValue().getQuantityDelta());
        assertEquals("Catalogue edit stock adjustment", movementCaptor.getValue().getReason());
    }

    @Test
    void rejectsInvalidImageContentBeforeStorage() {
        MockMultipartFile file = new MockMultipartFile("file", "x.png", "image/png", "not-an-image".getBytes());
        assertThrows(IllegalArgumentException.class,
                () -> service.uploadImage(3L, 11L, file, authentication));
        verify(imageStorageService, never()).uploadImageWithKey(any(), anyString(), anyString());
    }

    @Test
    void rejectsGlobalProductCreation() {
        ProductRequest request = validRequest();
        request.setLocationId(null);

        assertThrows(IllegalArgumentException.class, () -> service.create(request, authentication));
        verify(productRepository, never()).save(any(Product.class));
        verify(locationProductRepository, never()).save(any());
        verify(menuRepository, never()).save(any());
    }

    @Test
    void assignmentCreatesStableLegacyMenuProjection() {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "menuRepository", menuRepository);
        Product product = new Product();
        product.setId(21L);
        product.setActive(true);
        product.setSku("ABC");
        product.setVariantIdentity("500G");
        product.setName("Soap");
        product.setMrp(new BigDecimal("40"));

        LocationProduct assignment = new LocationProduct();
        assignment.setId(44L);
        assignment.setProduct(product);
        assignment.setLocation(location);
        assignment.setSellingPrice(new BigDecimal("35"));
        assignment.setVisible(true);
        assignment.setAvailable(true);
        when(productRepository.findById(21L)).thenReturn(Optional.of(product));
        when(locationProductRepository.save(any(LocationProduct.class))).thenReturn(assignment);
        when(menuRepository.findByCatalogProductIdAndLocationId(21L, 11L)).thenReturn(Optional.empty());
        when(menuRepository.save(any(MenuItem.class))).thenAnswer(invocation -> {
            MenuItem projection = invocation.getArgument(0);
            projection.setId(91L);
            return projection;
        });
        when(taxCalculationService.calculateInclusive(any(), any()))
                .thenAnswer(invocation -> TaxCalculationService.TaxCalculationResult.zero(invocation.getArgument(0)));

        ProductAssignmentRequest request = new ProductAssignmentRequest();
        request.setLocationId(11L);
        request.setVisible(true);
        request.setAvailable(true);

        ProductResponse response = service.assign(21L, request, authentication);

        assertEquals(44L, response.getLocationProductId());
        ArgumentCaptor<MenuItem> projectionCaptor = ArgumentCaptor.forClass(MenuItem.class);
        verify(menuRepository).save(projectionCaptor.capture());
        assertEquals(91L, projectionCaptor.getValue().getId());
        assertEquals("CATALOG-21-11", projectionCaptor.getValue().getSkuCode());
        assertNotEquals(product.getId(), projectionCaptor.getValue().getId());
    }

    private ProductRequest validRequest() {
        ProductRequest request = new ProductRequest();
        request.setVariantIdentity("500g");
        request.setName("Soap");
        request.setMrp(new BigDecimal("40"));
        request.setCostPrice(new BigDecimal("20"));
        request.setLocationId(11L);
        return request;
    }
}
