package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.HallOfHappinessPhoto;
import com.broandbro.qrapp.entity.PartyOrder;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.HallOfHappinessConsentStatus;
import com.broandbro.qrapp.enums.HallOfHappinessPhotoStatus;
import com.broandbro.qrapp.enums.PartyOrderStatus;
import com.broandbro.qrapp.repository.HallOfHappinessPhotoRepository;
import com.broandbro.qrapp.repository.PartyOrderRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.storage.ImageStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;
import java.util.List;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HallOfHappinessServiceTest {

    @Mock
    private HallOfHappinessPhotoRepository photoRepository;
    @Mock
    private PartyOrderRepository partyOrderRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ImageStorageService imageStorageService;
    @Mock
    private LocationAccessService locationAccessService;

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
                null, false));
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
                        null, true));
        verifyNoInteractions(imageStorageService);
    }

    @Test
    void customerUploadProcessesAndStoresAValidJpeg() throws Exception {
        User customer = new User();
        customer.setId(7L);
        when(userRepository.findByPhone("919999999999")).thenReturn(Optional.of(customer));
        PartyOrder order = new PartyOrder();
        order.setId(42L);
        order.setUserId(7L);
        order.setStatus(PartyOrderStatus.COMPLETED);
        when(partyOrderRepository.findById(42L)).thenReturn(Optional.of(order));
        when(imageStorageService.uploadImage(any(), any(), any())).thenReturn("https://example.com/photo.jpg");
        when(photoRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        BufferedImage image = new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", bytes);

        var result = service.uploadCustomerPhotos(
                42L,
                "919999999999",
                List.of(new MockMultipartFile("files", "memory.jpg", "image/jpeg", bytes.toByteArray())),
                "A happy day",
                true);

        org.junit.jupiter.api.Assertions.assertEquals(1, result.size());
        ArgumentCaptor<HallOfHappinessPhoto> saved = ArgumentCaptor.forClass(HallOfHappinessPhoto.class);
        verify(photoRepository, times(1)).save(saved.capture());
        org.junit.jupiter.api.Assertions.assertEquals(
                HallOfHappinessPhotoStatus.PENDING_REVIEW, saved.getValue().getStatus());
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
