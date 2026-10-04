package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.HallOfHappinessPhoto;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.PartyOrder;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.HallOfHappinessConsentStatus;
import com.broandbro.qrapp.enums.HallOfHappinessPhotoStatus;
import com.broandbro.qrapp.enums.HallOfHappinessSourceType;
import com.broandbro.qrapp.enums.PartyOrderStatus;
import com.broandbro.qrapp.entity.UserRole;
import com.broandbro.qrapp.dto.happiness.HallOfHappinessPhotoUpdateRequest;
import com.broandbro.qrapp.repository.HallOfHappinessPhotoRepository;
import com.broandbro.qrapp.repository.HallOfHappinessSubmissionRepository;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.PartyOrderRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.storage.ImageStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;
import java.util.List;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HallOfHappinessServiceTest {

    @Mock
    private HallOfHappinessPhotoRepository photoRepository;
    @Mock
    private HallOfHappinessSubmissionRepository submissionRepository;
    @Mock
    private PartyOrderRepository partyOrderRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ImageStorageService imageStorageService;
    @Mock
    private LocationAccessService locationAccessService;
    @Mock
    private LocationRepository locationRepository;

    @InjectMocks
    private HallOfHappinessService service;

    @Test
    void publishRequiresCustomerConsent() {
        HallOfHappinessPhoto photo = photo(HallOfHappinessPhotoStatus.APPROVED,
                HallOfHappinessConsentStatus.PENDING);
        when(photoRepository.findById(1L)).thenReturn(Optional.of(photo));

        assertThrows(IllegalStateException.class, () -> service.publish(1L, "admin"));
        verify(photoRepository, never()).save(any());
    }

    @Test
    void revokingConsentUnpublishesPhotoAndEvictsItsPublicEligibility() {
        HallOfHappinessPhoto photo = photo(HallOfHappinessPhotoStatus.PUBLISHED,
                HallOfHappinessConsentStatus.GRANTED);
        User user = new User();
        user.setId(7L);
        when(userRepository.findByPhone("919999999999")).thenReturn(Optional.of(user));
        when(photoRepository.findByIdAndCustomerId(1L, 7L)).thenReturn(Optional.of(photo));
        when(photoRepository.save(photo)).thenReturn(photo);

        service.setConsent(1L, "919999999999", false);

        org.junit.jupiter.api.Assertions.assertEquals(HallOfHappinessPhotoStatus.UNPUBLISHED, photo.getStatus());
        org.junit.jupiter.api.Assertions.assertEquals(HallOfHappinessConsentStatus.REVOKED, photo.getConsentStatus());
        verify(photoRepository).save(photo);
    }

    @Test
    void customerUploadRequiresConsent() {
        assertThrows(IllegalArgumentException.class, () -> service.uploadCustomerPhotos(
                42L, "919999999999",
                List.of(new MockMultipartFile("files", "memory.jpg", "image/jpeg", new byte[]{1})),
                List.of("Memory"), false, "hall-of-happiness-v1"));
        verifyNoInteractions(partyOrderRepository, photoRepository);
    }

    @Test
    void customerUploadRejectsAnotherCustomersCompletedOrder() {
        User customer = new User();
        customer.setId(7L);
        when(userRepository.findByPhone("919999999999")).thenReturn(Optional.of(customer));
        PartyOrder order = new PartyOrder();
        order.setId(42L);
        order.setUserId(8L);
        order.setStatus(PartyOrderStatus.COMPLETED);
        when(partyOrderRepository.findById(42L)).thenReturn(Optional.of(order));

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.uploadCustomerPhotos(
                        42L, "919999999999",
                        List.of(new MockMultipartFile("files", "memory.jpg", "image/jpeg", new byte[]{1})),
                        List.of("Memory"), true, "hall-of-happiness-v1"));
        verifyNoInteractions(imageStorageService);
    }

    @Test
    void customerUploadProcessesBatchWithIndependentDescriptions() throws Exception {
        User customer = new User();
        customer.setId(7L);
        when(userRepository.findByPhone("919999999999")).thenReturn(Optional.of(customer));
        PartyOrder order = new PartyOrder();
        order.setId(42L);
        order.setUserId(7L);
        order.setStatus(PartyOrderStatus.COMPLETED);
        order.setOrderType("PARTY");
        order.setEstimatedTotalAmount(new java.math.BigDecimal("1500.00"));
        when(partyOrderRepository.findById(42L)).thenReturn(Optional.of(order));
        when(imageStorageService.uploadImage(any(), any(), any())).thenReturn("https://example.com/photo.jpg");
        when(photoRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        BufferedImage image = new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", bytes);

        var result = service.uploadCustomerPhotos(
                42L,
                "919999999999",
                List.of(
                        new MockMultipartFile("files", "memory-1.jpg", "image/jpeg", bytes.toByteArray()),
                        new MockMultipartFile("files", "memory-2.jpg", "image/jpeg", bytes.toByteArray())),
                List.of("A happy day", "Team celebration"),
                true,
                "hall-of-happiness-v1");

        org.junit.jupiter.api.Assertions.assertEquals(2, result.size());
        ArgumentCaptor<HallOfHappinessPhoto> saved = ArgumentCaptor.forClass(HallOfHappinessPhoto.class);
        verify(photoRepository, times(2)).save(saved.capture());
        org.junit.jupiter.api.Assertions.assertEquals(HallOfHappinessPhotoStatus.PENDING_REVIEW,
                saved.getAllValues().get(0).getStatus());
        org.junit.jupiter.api.Assertions.assertEquals("A happy day", saved.getAllValues().get(0).getCaption());
        org.junit.jupiter.api.Assertions.assertEquals("Team celebration", saved.getAllValues().get(1).getCaption());
    }

    // ── Location isolation ──────────────────────────────────────────────

    @Test
    void publishedFeedFiltersByRequestedLocationServerSide() {
        Location pragatiNagar = location(1L, true);
        when(locationRepository.findById(1L)).thenReturn(Optional.of(pragatiNagar));
        when(photoRepository.findPublishedForLocation(
                eq(HallOfHappinessPhotoStatus.PUBLISHED), eq(HallOfHappinessConsentStatus.GRANTED),
                eq(1L), any(PageRequest.class)))
                .thenReturn(Page.empty());

        service.publishedFeed(1L, 0, 8);

        verify(photoRepository).findPublishedForLocation(
                HallOfHappinessPhotoStatus.PUBLISHED, HallOfHappinessConsentStatus.GRANTED, 1L,
                PageRequest.of(0, 8));
        verify(photoRepository, never()).findPublished(any(), any(), any());
    }

    @Test
    void publishedFeedWithNoLocationReturnsGlobalOnly() {
        when(photoRepository.findPublished(any(), any(), any())).thenReturn(Page.empty());

        service.publishedFeed(null, 0, 8);

        verify(photoRepository).findPublished(
                HallOfHappinessPhotoStatus.PUBLISHED, HallOfHappinessConsentStatus.GRANTED,
                PageRequest.of(0, 8));
        verify(photoRepository, never()).findPublishedForLocation(any(), any(), any(), any());
    }

    @Test
    void publishedFeedRejectsInactiveOrUnknownLocation() {
        when(locationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.publishedFeed(99L, 0, 8));
        verifyNoInteractions(photoRepository);
    }

    @Test
    void managerCannotCreateGlobalCuratedPhotoWithoutSuperAdmin() {
        User manager = adminUser(UserRole.MANAGER);
        when(userRepository.findByPhone("manager")).thenReturn(Optional.of(manager));
        doThrow(new org.springframework.security.access.AccessDeniedException("super_admin_required"))
                .when(locationAccessService).requireSuperAdmin(manager);

        MockMultipartFile file = new MockMultipartFile("file", "memory.jpg", "image/jpeg", new byte[]{1});
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.createCuratedPhoto(file, "Caption", null, null, null, true, "manager"));
        verifyNoInteractions(imageStorageService);
    }

    @Test
    void managerCreatingCuratedPhotoRequiresAccessToChosenLocation() {
        User manager = adminUser(UserRole.MANAGER);
        when(userRepository.findByPhone("manager")).thenReturn(Optional.of(manager));
        Location mindspace = location(2L, true);
        when(locationRepository.findById(2L)).thenReturn(Optional.of(mindspace));
        doThrow(new org.springframework.security.access.AccessDeniedException("location_access_denied"))
                .when(locationAccessService).requireLocationAccess(manager, 2L);

        MockMultipartFile file = new MockMultipartFile("file", "memory.jpg", "image/jpeg", new byte[]{1});
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.createCuratedPhoto(file, "Caption", null, null, 2L, false, "manager"));
        verifyNoInteractions(imageStorageService);
    }

    @Test
    void updatePhotoReassignmentRequiresAccessToTheNewLocation() {
        HallOfHappinessPhoto photo = HallOfHappinessPhoto.builder()
                .id(5L)
                .sourceType(HallOfHappinessSourceType.ADMIN_CURATED)
                .location(location(1L, true))
                .status(HallOfHappinessPhotoStatus.APPROVED)
                .build();
        when(photoRepository.findById(5L)).thenReturn(Optional.of(photo));
        User manager = adminUser(UserRole.MANAGER);
        when(userRepository.findByPhone("manager")).thenReturn(Optional.of(manager));
        Location mindspace = location(2L, true);
        when(locationRepository.findById(2L)).thenReturn(Optional.of(mindspace));
        doThrow(new org.springframework.security.access.AccessDeniedException("location_access_denied"))
                .when(locationAccessService).requireLocationAccess(manager, 2L);

        HallOfHappinessPhotoUpdateRequest request = new HallOfHappinessPhotoUpdateRequest(
                null, null, null, null, null, 2L, null, null);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.updatePhoto(5L, request, "manager"));
        verify(photoRepository, never()).save(any());
    }

    @Test
    void updatePhotoReassigningToGlobalRequiresSuperAdmin() {
        HallOfHappinessPhoto photo = HallOfHappinessPhoto.builder()
                .id(5L)
                .sourceType(HallOfHappinessSourceType.ADMIN_CURATED)
                .location(location(1L, true))
                .global(false)
                .status(HallOfHappinessPhotoStatus.APPROVED)
                .build();
        when(photoRepository.findById(5L)).thenReturn(Optional.of(photo));
        User manager = adminUser(UserRole.MANAGER);
        when(userRepository.findByPhone("manager")).thenReturn(Optional.of(manager));
        doThrow(new org.springframework.security.access.AccessDeniedException("super_admin_required"))
                .when(locationAccessService).requireSuperAdmin(manager);

        HallOfHappinessPhotoUpdateRequest request = new HallOfHappinessPhotoUpdateRequest(
                null, null, null, null, true, null, null, null);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.updatePhoto(5L, request, "manager"));
        verify(photoRepository, never()).save(any());
    }

    @Test
    void requireAdminPhotoAccessDeniesManagerForAnotherLocationsCuratedPhoto() {
        HallOfHappinessPhoto photo = HallOfHappinessPhoto.builder()
                .id(5L)
                .sourceType(HallOfHappinessSourceType.ADMIN_CURATED)
                .location(location(2L, true))
                .global(false)
                .build();
        when(photoRepository.findById(5L)).thenReturn(Optional.of(photo));
        User managerForLocationOne = adminUser(UserRole.MANAGER);
        doThrow(new org.springframework.security.access.AccessDeniedException("location_access_denied"))
                .when(locationAccessService).requireLocationAccess(managerForLocationOne, 2L);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.requireAdminPhotoAccess(5L, managerForLocationOne));
    }

    @Test
    void requireAdminPhotoAccessAllowsGlobalCuratedPhotoForAnyAuthorizedAdmin() {
        HallOfHappinessPhoto photo = HallOfHappinessPhoto.builder()
                .id(5L)
                .sourceType(HallOfHappinessSourceType.ADMIN_CURATED)
                .global(true)
                .build();
        when(photoRepository.findById(5L)).thenReturn(Optional.of(photo));
        User manager = adminUser(UserRole.MANAGER);

        service.requireAdminPhotoAccess(5L, manager);
        verifyNoInteractions(locationAccessService);
    }

    private Location location(Long id, boolean active) {
        Location location = new Location();
        location.setId(id);
        location.setActive(active);
        location.setName("Location " + id);
        return location;
    }

    private User adminUser(UserRole role) {
        User user = new User();
        user.setId(50L);
        user.setRole(role);
        return user;
    }

    private HallOfHappinessPhoto photo(
            HallOfHappinessPhotoStatus status,
            HallOfHappinessConsentStatus consent) {
        PartyOrder order = new PartyOrder();
        order.setId(42L);
        order.setUserId(7L);
        order.setStatus(PartyOrderStatus.COMPLETED);
        HallOfHappinessPhoto photo = HallOfHappinessPhoto.builder()
                .id(1L)
                .partyOrder(order)
                .customerId(7L)
                .imageUrl("https://example.com/photo.jpg")
                .thumbnailUrl("https://example.com/thumb.jpg")
                .status(status)
                .consentStatus(consent)
                .build();
        return photo;
    }
}
