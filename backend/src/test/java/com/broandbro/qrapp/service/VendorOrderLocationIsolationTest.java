package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.VendorOrderCreateRequest;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.Vendor;
import com.broandbro.qrapp.entity.VendorOrder;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.VendorOrderRepository;
import com.broandbro.qrapp.repository.VendorRepository;
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
 * Verifies the vendor (procurement) order surface honours location scoping:
 * creation derives + enforces the ordered items' location, reads/updates reject
 * out-of-scope orders, and SUPER_ADMIN ("All Locations") disables the filter.
 */
class VendorOrderLocationIsolationTest {

    private final VendorOrderRepository vendorOrderRepo = mock(VendorOrderRepository.class);
    private final VendorRepository vendorRepo = mock(VendorRepository.class);
    private final MenuRepository menuRepo = mock(MenuRepository.class);
    private final PricingService pricingService = mock(PricingService.class);
    private final LocationAccessService locationAccessService = mock(LocationAccessService.class);

    private final VendorOrderService service =
            new VendorOrderService(vendorOrderRepo, vendorRepo, menuRepo, pricingService, locationAccessService);

    private static Location location(long id) {
        return Location.builder().id(id).code("L" + id).name("L" + id).active(true).build();
    }

    private static VendorOrder order(long id, Location location) {
        VendorOrder o = new VendorOrder();
        o.setId(id);
        o.setLocation(location);
        o.setStatus(OrderStatus.ORDER_PLACED);
        o.setTotalAmount(BigDecimal.ZERO);
        return o;
    }

    @Test
    void createDerivesLocationFromItemsAndEnforcesAccess() {
        Vendor vendor = mock(Vendor.class);
        when(vendor.getId()).thenReturn(1L);
        when(vendorRepo.findById(1L)).thenReturn(Optional.of(vendor));

        Location itemLocation = location(7L);
        MenuItem menuItem = mock(MenuItem.class);
        when(menuItem.getId()).thenReturn(50L);
        when(menuItem.getVendor()).thenReturn(vendor);
        when(menuItem.getLocation()).thenReturn(itemLocation);
        when(menuRepo.findById(50L)).thenReturn(Optional.of(menuItem));
        when(pricingService.getCurrentVendorCost(1L, 50L)).thenReturn(Optional.of(BigDecimal.TEN));
        when(vendorOrderRepo.save(org.mockito.ArgumentMatchers.any(VendorOrder.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        User actor = User.builder().id(9L).phone("admin").build();
        VendorOrderCreateRequest req = new VendorOrderCreateRequest(
                1L, List.of(new VendorOrderCreateRequest.VendorOrderItemRequest(50L, 2)), "note");

        service.createOrder(req, actor);

        verify(locationAccessService).requireLocationAccess(actor, 7L);
        ArgumentCaptor<VendorOrder> saved = ArgumentCaptor.forClass(VendorOrder.class);
        verify(vendorOrderRepo).save(saved.capture());
        assertThat(saved.getValue().getLocation()).isSameAs(itemLocation);
    }

    @Test
    void readOfOutOfScopeOrderIsRejected() {
        when(vendorOrderRepo.findById(5L)).thenReturn(Optional.of(order(5L, location(3L))));

        assertThatThrownBy(() -> service.getOrder(5L, Optional.of(List.of(10L))))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void readOfInScopeOrderIsAllowed() {
        when(vendorOrderRepo.findById(5L)).thenReturn(Optional.of(order(5L, location(10L))));

        assertThat(service.getOrder(5L, Optional.of(List.of(10L))).getLocationId()).isEqualTo(10L);
    }

    @Test
    void superAdminListDisablesLocationFilter() {
        when(vendorOrderRepo.findAll()).thenReturn(List.of());

        service.listOrders(Optional.empty());

        verify(vendorOrderRepo).findAll();
        verify(vendorOrderRepo, never()).findByLocationIdInOrderByCreatedAtDesc(anyCollection());
    }

    @Test
    void restrictedListIsPushedIntoQuery() {
        when(vendorOrderRepo.findByLocationIdInOrderByCreatedAtDesc(anyCollection())).thenReturn(List.of());

        service.listOrders(Optional.of(List.of(10L)));

        verify(vendorOrderRepo).findByLocationIdInOrderByCreatedAtDesc(eq(List.of(10L)));
    }

    @Test
    void statusTransitionOfOutOfScopeOrderIsRejected() {
        when(vendorOrderRepo.findById(5L)).thenReturn(Optional.of(order(5L, location(3L))));

        assertThatThrownBy(() ->
                service.transitionOrderStatus(5L, OrderStatus.ACKNOWLEDGED, Optional.of(List.of(10L))))
                .isInstanceOf(AccessDeniedException.class);
    }
}
