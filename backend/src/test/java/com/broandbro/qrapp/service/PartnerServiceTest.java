package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PartnerServiceTest {
    @Mock PartnerRepository partnerRepository;
    @Mock PartnerLocationRepository partnerLocationRepository;
    @Mock PartnerUserRepository partnerUserRepository;
    @Mock LocationRepository locationRepository;
    @Mock UserRepository userRepository;
    @InjectMocks PartnerService service;

    @Test
    void createRejectsDuplicatePartnerCode() {
        CreatePartnerRequest request = validRequest();
        when(partnerRepository.existsByPartnerCodeIgnoreCase("URBANWRK")).thenReturn(true);
        assertThrows(DataIntegrityViolationException.class, () -> service.create(request, "admin"));
        verify(partnerRepository, never()).save(any());
    }

    @Test
    void responseMasksAccountNumber() {
        Partner partner = Partner.builder().id(1L).partnerCode("URBANWRK").legalName("Urban Work")
                .displayName("Urban Work").primaryContactName("Dev Contact")
                .primaryContactEmail("dev@example.test").primaryContactPhone("9876543210")
                .accountNumber("123456789012").status(PartnerStatus.ACTIVE).build();
        when(partnerRepository.findById(1L)).thenReturn(Optional.of(partner));
        assertEquals("****9012", service.get(1L).getMaskedAccountNumber());
    }

    @Test
    void assignmentRejectsInactivePartner() {
        Partner partner = Partner.builder().id(1L).status(PartnerStatus.INACTIVE).build();
        when(partnerRepository.findById(1L)).thenReturn(Optional.of(partner));
        PartnerLocationRequest request = new PartnerLocationRequest();
        request.setLocationId(2L);
        assertEquals("partner_inactive",
                assertThrows(PartnerService.ConflictException.class,
                        () -> service.assignLocation(1L, request, "admin")).getMessage());
        verifyNoInteractions(locationRepository);
    }

    @Test
    void assignmentRejectsExistingPrimaryLocation() {
        Partner partner = Partner.builder().id(1L).status(PartnerStatus.ACTIVE).build();
        Location location = Location.builder().id(2L).active(true).build();
        when(partnerRepository.findById(1L)).thenReturn(Optional.of(partner));
        when(locationRepository.findById(2L)).thenReturn(Optional.of(location));
        when(partnerLocationRepository.existsByPartnerIdAndLocationIdAndStatus(
                1L, 2L, PartnerRelationshipStatus.ACTIVE)).thenReturn(false);
        when(partnerLocationRepository.findActivePrimaryByLocation(2L, PartnerRelationshipStatus.ACTIVE,
                PartnerRelationshipType.PRIMARY)).thenReturn(Optional.of(PartnerLocation.builder().build()));
        PartnerLocationRequest request = new PartnerLocationRequest();
        request.setLocationId(2L);
        assertEquals("location_primary_partner_exists",
                assertThrows(PartnerService.ConflictException.class,
                        () -> service.assignLocation(1L, request, "admin")).getMessage());
    }

    @Test
    void updatePreservesAccountNumberWhenMaskedValueIsNotSubmitted() {
        Partner partner = Partner.builder().id(1L).partnerCode("URBANWRK").legalName("Urban Work")
                .displayName("Urban Work").primaryContactName("Dev Contact")
                .primaryContactEmail("dev@example.test").primaryContactPhone("9876543210")
                .accountNumber("123456789012").status(PartnerStatus.ACTIVE).build();
        when(partnerRepository.findById(1L)).thenReturn(Optional.of(partner));
        when(partnerRepository.existsByPartnerCodeIgnoreCaseAndIdNot("URBANWRK", 1L)).thenReturn(false);
        when(partnerRepository.save(any(Partner.class))).thenAnswer(invocation -> invocation.getArgument(0));
        UpdatePartnerRequest request = new UpdatePartnerRequest();
        request.setPartnerCode("URBANWRK");
        request.setLegalName("Urban Work Updated");
        request.setDisplayName("Urban Work");
        request.setPrimaryContactName("Dev Contact");
        request.setPrimaryContactEmail("dev@example.test");
        request.setPrimaryContactPhone("9876543210");
        assertEquals("****9012", service.update(1L, request, "admin").getMaskedAccountNumber());
    }

    @Test
    void duplicateActivePartnerLocationIsRejected() {
        Partner partner = Partner.builder().id(1L).status(PartnerStatus.ACTIVE).build();
        Location location = Location.builder().id(2L).active(true).build();
        when(partnerRepository.findById(1L)).thenReturn(Optional.of(partner));
        when(locationRepository.findById(2L)).thenReturn(Optional.of(location));
        when(partnerLocationRepository.existsByPartnerIdAndLocationIdAndStatus(
                1L, 2L, PartnerRelationshipStatus.ACTIVE)).thenReturn(true);
        PartnerLocationRequest request = new PartnerLocationRequest();
        request.setLocationId(2L);
        assertEquals("partner_location_exists",
                assertThrows(PartnerService.ConflictException.class,
                        () -> service.assignLocation(1L, request, "admin")).getMessage());
    }

    @Test
    void duplicateActivePartnerUserIsRejected() {
        Partner partner = Partner.builder().id(1L).status(PartnerStatus.ACTIVE).build();
        User user = User.builder().id(2L).name("Existing").phone("9876543210").active(true).build();
        PartnerUser link = PartnerUser.builder().id(3L).partner(partner).user(user).active(true).build();
        when(partnerRepository.findById(1L)).thenReturn(Optional.of(partner));
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));
        when(partnerUserRepository.findByPartnerIdAndUserId(1L, 2L)).thenReturn(Optional.of(link));
        PartnerUserRequest request = new PartnerUserRequest();
        request.setUserId(2L);
        assertEquals("partner_user_exists",
                assertThrows(PartnerService.ConflictException.class,
                        () -> service.addUser(1L, request, "admin")).getMessage());
        verify(partnerUserRepository, never()).save(any());
    }

    @Test
    void inactiveUserCannotBeAssociated() {
        Partner partner = Partner.builder().id(1L).status(PartnerStatus.ACTIVE).build();
        User user = User.builder().id(2L).phone("9876543210").active(false).build();
        when(partnerRepository.findById(1L)).thenReturn(Optional.of(partner));
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));
        PartnerUserRequest request = new PartnerUserRequest();
        request.setUserId(2L);
        assertEquals("user_inactive",
                assertThrows(PartnerService.ConflictException.class,
                        () -> service.addUser(1L, request, "admin")).getMessage());
    }

    private static CreatePartnerRequest validRequest() {
        CreatePartnerRequest request = new CreatePartnerRequest();
        request.setPartnerCode("urbanwrk");
        request.setLegalName("Urban Work");
        request.setDisplayName("Urban Work");
        request.setPrimaryContactName("Dev Contact");
        request.setPrimaryContactEmail("dev@example.test");
        request.setPrimaryContactPhone("9876543210");
        return request;
    }
}
