package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartnerAccessServiceTest {
    @Mock UserRepository users;
    @Mock PartnerUserRepository partnerUsers;
    @Mock PartnerLocationRepository locations;
    @Mock UserLocationAccessRepository userLocationAccess;
    @Mock OrderRepository orders;
    @Mock Authentication authentication;

    @Test
    void partnerCannotReadAnotherPartnersLocation() {
        Partner partner = Partner.builder().id(1L).status(PartnerStatus.ACTIVE).build();
        User user = User.builder().id(10L).phone("9000000000").role(UserRole.PARTNER_USER).active(true).build();
        PartnerUser association = PartnerUser.builder().partner(partner).user(user).active(true).build();
        when(authentication.getName()).thenReturn("9000000000");
        when(users.findByPhone("9000000000")).thenReturn(Optional.of(user));
        when(partnerUsers.findByUserIdAndActiveTrue(10L)).thenReturn(Optional.of(association));
        when(locations.findByPartnerIdAndLocationIdAndStatus(1L, 99L, PartnerRelationshipStatus.ACTIVE))
                .thenReturn(Optional.empty());

        PartnerAccessService service = new PartnerAccessService(users, partnerUsers, locations, userLocationAccess, orders);
        assertThrows(AccessDeniedException.class, () -> service.accessibleLocation(99L, authentication));
    }

    @Test
    void inactivePartnerAssociationIsDenied() {
        Partner partner = Partner.builder().id(1L).status(PartnerStatus.INACTIVE).build();
        User user = User.builder().id(10L).phone("9000000000").role(UserRole.PARTNER_USER).active(true).build();
        when(authentication.getName()).thenReturn("9000000000");
        when(users.findByPhone("9000000000")).thenReturn(Optional.of(user));
        when(partnerUsers.findByUserIdAndActiveTrue(10L))
                .thenReturn(Optional.of(PartnerUser.builder().partner(partner).user(user).active(true).build()));

        PartnerAccessService service = new PartnerAccessService(users, partnerUsers, locations, userLocationAccess, orders);
        assertThrows(AccessDeniedException.class, () -> service.currentAssociation(authentication));
    }
}
