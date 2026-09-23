package com.broandbro.qrapp.signature.service;

import com.broandbro.qrapp.enums.SignatureInventoryOperation;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.signature.dto.StockUpdateRequest;
import com.broandbro.qrapp.signature.entity.SignatureProduct;
import com.broandbro.qrapp.signature.exception.InsufficientStockException;
import com.broandbro.qrapp.signature.exception.SignatureProductNotFoundException;
import com.broandbro.qrapp.signature.repository.SignatureProductAnalyticsDailyRepository;
import com.broandbro.qrapp.signature.repository.SignatureProductInventoryLogRepository;
import com.broandbro.qrapp.signature.repository.SignatureProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SignatureProductServiceImpl – stock update")
class SignatureProductServiceImplTest {

    @Mock SignatureProductRepository productRepo;
    @Mock SignatureProductInventoryLogRepository logRepo;
    @Mock SignatureProductAnalyticsDailyRepository analyticsRepo;
    @Mock LocationRepository locationRepo;

    @InjectMocks SignatureProductServiceImpl sut;

    /** SUPER_ADMIN "All Locations" scope — no location filter is applied. */
    private static final Optional<List<Long>> ALL_LOCATIONS = Optional.empty();

    private SignatureProduct product;

    @BeforeEach
    void setUp() {
        product = SignatureProduct.builder()
                .id(1L).productName("Gongura Pickle")
                .sellingPrice(BigDecimal.valueOf(25))
                .stockQuantity(10).minimumStockThreshold(3)
                .isActive(true).isFeatured(false).isComboAttachable(true)
                .displayPriority(0).version(0L)
                .build();
    }

    @Test
    @DisplayName("STOCK_IN increases stock correctly")
    void stock_in_increases_quantity() {
        when(productRepo.findActiveById(1L)).thenReturn(Optional.of(product));
        when(productRepo.save(any())).thenReturn(product);
        when(logRepo.save(any())).thenReturn(null);

        sut.updateStock(1L, new StockUpdateRequest(SignatureInventoryOperation.STOCK_IN, 5, "restock"), "admin", ALL_LOCATIONS);

        assertThat(product.getStockQuantity()).isEqualTo(15);
    }

    @Test
    @DisplayName("SALE deducts stock correctly")
    void sale_deducts_stock() {
        when(productRepo.findActiveById(1L)).thenReturn(Optional.of(product));
        when(productRepo.save(any())).thenReturn(product);
        when(logRepo.save(any())).thenReturn(null);

        sut.updateStock(1L, new StockUpdateRequest(SignatureInventoryOperation.SALE, 3, null), "system", ALL_LOCATIONS);

        assertThat(product.getStockQuantity()).isEqualTo(7);
    }

    @Test
    @DisplayName("STOCK_OUT throws InsufficientStockException when requested > available")
    void stock_out_throws_when_insufficient() {
        when(productRepo.findActiveById(1L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() ->
                sut.updateStock(1L, new StockUpdateRequest(SignatureInventoryOperation.STOCK_OUT, 20, null), "admin", ALL_LOCATIONS))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("Insufficient stock");
    }

    @Test
    @DisplayName("getProductById throws when product not found")
    void get_throws_when_not_found() {
        when(productRepo.findActiveById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> sut.getProductById(99L, ALL_LOCATIONS))
                .isInstanceOf(SignatureProductNotFoundException.class)
                .hasMessageContaining("99");
    }
}

