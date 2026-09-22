package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.partyorder.PartyOrderCreateRequest;
import com.broandbro.qrapp.dto.partyorder.PartyOrderResponse;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.PartyOrder;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.PartyOrderStatus;
import com.broandbro.qrapp.repository.PartyOrderMenuItemRepository;
import com.broandbro.qrapp.repository.PartyOrderRepository;
import com.broandbro.qrapp.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

/**
 * Verifies the admin party-order surface honours the dashboard location scope:
 * SUPER_ADMIN ("All Locations") disables the filter, a restricted scope is pushed
 * into the query, cross-location reads are rejected, and creation stamps the
 * requesting user's default location.
 */
class PartyOrderLocationIsolationTest {

    private final PartyOrderRepository partyOrderRepo = mock(PartyOrderRepository.class);
    private final UserRepository userRepo = mock(UserRepository.class);
    private final PartyOrderMenuItemRepository menuItemRepo = mock(PartyOrderMenuItemRepository.class);

    private final PartyOrderServiceImpl service =
            new PartyOrderServiceImpl(partyOrderRepo, userRepo, menuItemRepo);

    private static Location location(long id) {
        return Location.builder().id(id).code("L" + id).name("L" + id).active(true).build();
    }

    private static PartyOrder order(long id, Location location) {
        return PartyOrder.builder()
                .id(id).userId(99L).location(location)
                .eventDateTime(LocalDateTime.now().plusDays(3)).numberOfPeople(20)
                .status(PartyOrderStatus.NEW).currency("INR").build();
    }

    @Test
    void superAdminScopeDisablesLocationFilter() {
        when(partyOrderRepo.findAllByOrderByCreatedAtDesc()).thenReturn(List.of());

        service.getAllPartyOrders(Optional.empty());

        verify(partyOrderRepo).findAllByOrderByCreatedAtDesc();
        verify(partyOrderRepo, never()).findByLocationIdInOrderByCreatedAtDesc(anyCollection());
    }

    @Test
    void restrictedScopeIsPushedIntoQuery() {
        when(partyOrderRepo.findByLocationIdInOrderByCreatedAtDesc(anyCollection())).thenReturn(List.of());

        service.getAllPartyOrders(Optional.of(List.of(10L, 11L)));

        ArgumentCaptor<java.util.Collection<Long>> ids = ArgumentCaptor.forClass(java.util.Collection.class);
        verify(partyOrderRepo).findByLocationIdInOrderByCreatedAtDesc(ids.capture());
        assertThat(ids.getValue()).containsExactly(10L, 11L);
    }

    @Test
    void readOfOutOfScopeOrderIsRejected() {
        when(partyOrderRepo.findById(5L)).thenReturn(Optional.of(order(5L, location(3L))));

        assertThatThrownBy(() -> service.getPartyOrderById(5L, Optional.of(List.of(10L))))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void readOfInScopeOrderIsAllowed() {
        when(partyOrderRepo.findById(5L)).thenReturn(Optional.of(order(5L, location(10L))));

        PartyOrderResponse response = service.getPartyOrderById(5L, Optional.of(List.of(10L)));

        assertThat(response.id()).isEqualTo(5L);
        assertThat(response.locationId()).isEqualTo(10L);
    }

    @Test
    void superAdminCanReadAnyLocation() {
        when(partyOrderRepo.findById(5L)).thenReturn(Optional.of(order(5L, location(3L))));

        PartyOrderResponse response = service.getPartyOrderById(5L, Optional.empty());

        assertThat(response.locationId()).isEqualTo(3L);
    }

    @Test
    void createStampsUsersDefaultLocation() {
        Location userLocation = location(7L);
        User user = User.builder().id(99L).phone("999").name("Ann").defaultLocation(userLocation).build();
        when(userRepo.findByPhone("999")).thenReturn(Optional.of(user));
        when(partyOrderRepo.save(org.mockito.ArgumentMatchers.any(PartyOrder.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        PartyOrderCreateRequest req = new PartyOrderCreateRequest(
                LocalDateTime.now().plusDays(2), 15, List.of("Biryani"),
                "Hall", "Birthday", "no nuts", null);

        service.createPartyOrder(req, "999");

        ArgumentCaptor<PartyOrder> saved = ArgumentCaptor.forClass(PartyOrder.class);
        verify(partyOrderRepo).save(saved.capture());
        assertThat(saved.getValue().getLocation()).isSameAs(userLocation);
    }
}
