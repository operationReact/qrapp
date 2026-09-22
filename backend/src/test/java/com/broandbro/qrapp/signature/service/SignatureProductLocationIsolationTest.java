package com.broandbro.qrapp.signature.service;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.enums.SignatureProductCategory;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.signature.dto.SignatureProductCreateRequest;
import com.broandbro.qrapp.signature.entity.SignatureProduct;
import com.broandbro.qrapp.signature.repository.SignatureProductAnalyticsDailyRepository;
import com.broandbro.qrapp.signature.repository.SignatureProductInventoryLogRepository;
import com.broandbro.qrapp.signature.repository.SignatureProductRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Verifies signature-product reads/mutations honour the caller's location scope,
 * that SUPER_ADMIN ("All Locations") is unrestricted, and that creation stamps the
 * requested location.
 */
class SignatureProductLocationIsolationTest {

    private final SignatureProductRepository productRepo = mock(SignatureProductRepository.class);
    private final SignatureProductInventoryLogRepository logRepo = mock(SignatureProductInventoryLogRepository.class);
    private final SignatureProductAnalyticsDailyRepository analyticsRepo = mock(SignatureProductAnalyticsDailyRepository.class);
    private final LocationRepository locationRepo = mock(LocationRepository.class);

    private final SignatureProductServiceImpl service =
            new SignatureProductServiceImpl(productRepo, logRepo, analyticsRepo, locationRepo);

    private static Location location(long id) {
        return Location.builder().id(id).code("L" + id).name("L" + id).active(true).build();
    }

    private static SignatureProduct product(long id, Location location) {
        return SignatureProduct.builder()
                .id(id).location(location).productName("Gongura").shortName("Gon")
                .category(SignatureProductCategory.PICKLE).sellingPrice(BigDecimal.TEN)
                .stockQuantity(5).minimumStockThreshold(2)
                .isActive(true).isFeatured(false).isComboAttachable(true)
                .displayPriority(0).version(0L).build();
    }

    @Test
    void readOfOutOfScopeProductIsRejected() {
        when(productRepo.findActiveById(5L)).thenReturn(Optional.of(product(5L, location(3L))));
        when(productRepo.findActiveByIdAndLocationIdIn(eq(5L), anyCollection())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getProductById(5L, Optional.of(List.of(10L))))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void readOfInScopeProductIsAllowed() {
        when(productRepo.findActiveById(5L)).thenReturn(Optional.of(product(5L, location(10L))));
        when(productRepo.findActiveByIdAndLocationIdIn(eq(5L), anyCollection()))
                .thenReturn(Optional.of(product(5L, location(10L))));

        assertThat(service.getProductById(5L, Optional.of(List.of(10L))).locationId()).isEqualTo(10L);
    }

    @Test
    void superAdminCanReadAnyLocationWithoutScopeQuery() {
        when(productRepo.findActiveById(5L)).thenReturn(Optional.of(product(5L, location(3L))));

        assertThat(service.getProductById(5L, Optional.empty()).locationId()).isEqualTo(3L);
        verify(productRepo, never()).findActiveByIdAndLocationIdIn(eq(5L), anyCollection());
    }

    @Test
    void createStampsRequestedLocation() {
        Location location = location(7L);
        when(locationRepo.findById(7L)).thenReturn(Optional.of(location));
        when(productRepo.save(org.mockito.ArgumentMatchers.any(SignatureProduct.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        SignatureProductCreateRequest req = new SignatureProductCreateRequest(
                7L, "Gongura", "Gon", "spicy", SignatureProductCategory.PICKLE, null,
                BigDecimal.TEN, BigDecimal.ONE, 0, 2, false, true, 0, null, null);

        service.createProduct(req);

        ArgumentCaptor<SignatureProduct> saved = ArgumentCaptor.forClass(SignatureProduct.class);
        verify(productRepo).save(saved.capture());
        assertThat(saved.getValue().getLocation()).isSameAs(location);
    }

    @Test
    void emptyScopeSeesNothing() {
        assertThatThrownBy(() -> service.getProductById(5L, Optional.of(List.of())))
                .isInstanceOf(AccessDeniedException.class);
    }
}
