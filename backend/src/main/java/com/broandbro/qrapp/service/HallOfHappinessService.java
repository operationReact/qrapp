package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.happiness.HallOfHappinessPhotoResponse;
import com.broandbro.qrapp.dto.happiness.HallOfHappinessPhotoUpdateRequest;
import com.broandbro.qrapp.entity.HallOfHappinessPhoto;
import com.broandbro.qrapp.entity.HallOfHappinessSubmission;
import com.broandbro.qrapp.entity.PartyOrder;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.HallOfHappinessConsentStatus;
import com.broandbro.qrapp.enums.HallOfHappinessPhotoStatus;
import com.broandbro.qrapp.enums.HallOfHappinessSubmissionStatus;
import com.broandbro.qrapp.enums.PartyOrderStatus;
import com.broandbro.qrapp.repository.HallOfHappinessPhotoRepository;
import com.broandbro.qrapp.repository.HallOfHappinessSubmissionRepository;
import com.broandbro.qrapp.repository.PartyOrderRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.storage.ImageStorageService;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.text.Normalizer;

@Service
public class HallOfHappinessService {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024L;
    private static final int MAX_PHOTOS_PER_ORDER = 5;
    private static final int MAX_FILES_PER_SUBMISSION = 5;
    private static final int MAX_CAPTION_LENGTH = 60;
    private static final int MAX_PAGE_SIZE = 50;

    private final HallOfHappinessPhotoRepository photoRepository;
    private final PartyOrderRepository partyOrderRepository;
    private final UserRepository userRepository;
    private final HallOfHappinessSubmissionRepository submissionRepository;
    private final ImageStorageService imageStorageService;
    private final LocationAccessService locationAccessService;

    public HallOfHappinessService(
            HallOfHappinessPhotoRepository photoRepository,
            PartyOrderRepository partyOrderRepository,
            UserRepository userRepository,
            HallOfHappinessSubmissionRepository submissionRepository,
            ImageStorageService imageStorageService,
            LocationAccessService locationAccessService) {
        this.photoRepository = photoRepository;
        this.partyOrderRepository = partyOrderRepository;
        this.userRepository = userRepository;
        this.submissionRepository = submissionRepository;
        this.imageStorageService = imageStorageService;
        this.locationAccessService = locationAccessService;
    }

    @Transactional(readOnly = true)
    public void requireAdminOrderAccess(Long orderId, User user) {
        PartyOrder order = requireCompletedOrder(orderId);
        if (order.getLocation() == null || order.getLocation().getId() == null) {
            throw new AccessDeniedException("location_access_denied");
        }
        locationAccessService.requireLocationAccess(user, order.getLocation().getId());
    }

    @Transactional(readOnly = true)
    public void requireAdminPhotoAccess(Long id, User user) {
        HallOfHappinessPhoto photo = requirePhoto(id);
        if (photo.getPartyOrder().getLocation() == null
                || photo.getPartyOrder().getLocation().getId() == null) {
            throw new AccessDeniedException("location_access_denied");
        }
        locationAccessService.requireLocationAccess(user, photo.getPartyOrder().getLocation().getId());
    }

    @Cacheable(cacheNames = "hallOfHappiness", key = "#phone + ':' + #page + ':' + #size", sync = true)
    @Transactional(readOnly = true)
    public Page<HallOfHappinessPhotoResponse> publishedFeed(String phone, int page, int size) {
        PageRequest request = PageRequest.of(safePage(page), safeSize(size));
        User customer = customer(phone);
        if (customer.getDefaultLocation() == null || customer.getDefaultLocation().getId() == null) {
            return Page.empty(request);
        }
        return photoRepository.findPublishedForLocation(
                        HallOfHappinessPhotoStatus.PUBLISHED,
                        HallOfHappinessConsentStatus.GRANTED,
                        customer.getDefaultLocation().getId(),
                        request)
                .map(HallOfHappinessPhotoResponse::forCustomer);
    }

    @Transactional(readOnly = true)
    public Page<HallOfHappinessPhotoResponse> customerPhotos(String phone, int page, int size) {
        Long customerId = userRepository.findByPhone(phone)
                .orElseThrow(() -> new IllegalArgumentException("customer_not_found"))
                .getId();
        return photoRepository.findForCustomer(customerId, PageRequest.of(safePage(page), safeSize(size)))
                .map(HallOfHappinessPhotoResponse::forCustomer);
    }

    @Transactional(readOnly = true)
    public List<HallOfHappinessPhotoResponse> customerOrderPhotos(Long orderId, String phone) {
        User customer = customer(phone);
        PartyOrder order = requireCompletedOrder(orderId);
        if (!customer.getId().equals(order.getUserId())) {
            throw new AccessDeniedException("party_order_access_denied");
        }
        return photoRepository.findForCustomerOrder(orderId, customer.getId()).stream()
                .map(HallOfHappinessPhotoResponse::forCustomer)
                .toList();
    }

    @CacheEvict(cacheNames = "hallOfHappiness", allEntries = true)
    @Transactional
    public List<HallOfHappinessPhotoResponse> uploadCustomerPhotos(
            Long orderId, String phone, List<MultipartFile> files, List<String> captions, boolean consent) {
        if (!consent) {
            throw new IllegalArgumentException("customer_consent_required");
        }
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("image_required");
        }
        if (files.size() > MAX_FILES_PER_SUBMISSION) {
            throw new IllegalArgumentException("too_many_images");
        }

        User customer = customer(phone);
        PartyOrder order = requireCompletedOrder(orderId);
        if (!customer.getId().equals(order.getUserId())) {
            throw new AccessDeniedException("party_order_access_denied");
        }
        if (captions == null || captions.size() != files.size()) {
            throw new IllegalArgumentException("photo_description_required");
        }
        if (photoRepository.countByPartyOrderIdAndCustomerId(orderId, customer.getId())
                + files.size() > MAX_PHOTOS_PER_ORDER) {
            throw new IllegalArgumentException("photo_limit_reached");
        }

        HallOfHappinessSubmission submission = submissionRepository.save(HallOfHappinessSubmission.builder()
                .partyOrder(order)
                .customerId(customer.getId())
                .consentAccepted(true)
                .consentAcceptedAt(java.time.Instant.now())
                .termsVersion("hall-of-happiness-v1")
                .status(HallOfHappinessSubmissionStatus.PENDING_REVIEW)
                .build());
        String folder = customerFolder(order);
        return java.util.stream.IntStream.range(0, files.size())
                .mapToObj(index -> {
                    String caption = trimCaption(captions.get(index));
                    if (caption == null || caption.isBlank()) {
                        throw new IllegalArgumentException("photo_description_required");
                    }
                    if (caption.length() > MAX_CAPTION_LENGTH) {
                        throw new IllegalArgumentException("photo_description_too_long");
                    }
                    return saveCustomerPhoto(order, customer, files.get(index), caption, folder, submission);
                })
                .map(HallOfHappinessPhotoResponse::forCustomer)
                .toList();
    }

    @CacheEvict(cacheNames = "hallOfHappiness", allEntries = true)
    @Transactional
    public HallOfHappinessPhotoResponse createPhoto(
            Long orderId, MultipartFile file, String caption, String adminUsername) {
        validateFile(file);
        PartyOrder order = requireCompletedOrder(orderId);

        byte[] image = optimize(file, 1600, 0.86);
        byte[] thumbnail = optimize(image, 720, 0.80);
        String folder = orderFolder(order);
        String imageUrl = imageStorageService.uploadImage(image, folder + "/original", "image/jpeg");
        String thumbnailUrl = imageStorageService.uploadImage(thumbnail, folder + "/thumbnail", "image/jpeg");

        HallOfHappinessPhoto photo = HallOfHappinessPhoto.builder()
                .partyOrder(order)
                .customerId(order.getUserId())
                .imageUrl(imageUrl)
                .thumbnailUrl(thumbnailUrl)
                .caption(trimCaption(caption))
                .createdBy(adminUsername)
                .build();
        return HallOfHappinessPhotoResponse.forAdmin(photoRepository.save(photo));
    }

    @Transactional(readOnly = true)
    public Page<HallOfHappinessPhotoResponse> adminSearch(
            HallOfHappinessPhotoStatus status,
            HallOfHappinessConsentStatus consent,
            Long orderId,
            Long customerId,
            LocalDate fromDate,
            LocalDate toDate,
            String search,
            boolean allLocations,
            Collection<Long> locationIds,
            int page,
            int size) {
        LocalDateTime from = fromDate == null ? null : fromDate.atStartOfDay();
        LocalDateTime to = toDate == null ? null : toDate.plusDays(1).atStartOfDay();
        String normalizedSearch = search == null || search.isBlank() ? null : search.trim();
        return photoRepository.search(status, consent, orderId, customerId, from, to,
                        normalizedSearch, allLocations, locationIds,
                        PageRequest.of(safePage(page), safeSize(size),
                                Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(HallOfHappinessPhotoResponse::forAdmin);
    }

    @CacheEvict(cacheNames = "hallOfHappiness", allEntries = true)
    @Transactional
    public HallOfHappinessPhotoResponse updatePhoto(
            Long id, HallOfHappinessPhotoUpdateRequest request, String adminUsername) {
        HallOfHappinessPhoto photo = requirePhoto(id);
        if (photo.getStatus() == HallOfHappinessPhotoStatus.REMOVED) {
            throw new IllegalStateException("photo_removed");
        }
        photo.setCaption(trimCaption(request.caption()));
        if (request.displayOrder() != null) {
            photo.setDisplayOrder(Math.max(0, request.displayOrder()));
        }
        photo.setModeratedBy(adminUsername);
        return HallOfHappinessPhotoResponse.forAdmin(photoRepository.save(photo));
    }

    @CacheEvict(cacheNames = "hallOfHappiness", allEntries = true)
    @Transactional
    public HallOfHappinessPhotoResponse approve(Long id, String adminUsername) {
        HallOfHappinessPhoto photo = requirePhoto(id);
        requireStatus(photo, HallOfHappinessPhotoStatus.CUSTOMER_UPLOAD,
                HallOfHappinessPhotoStatus.PENDING_REVIEW,
                HallOfHappinessPhotoStatus.PENDING,
                HallOfHappinessPhotoStatus.UNPUBLISHED);
        photo.setStatus(HallOfHappinessPhotoStatus.APPROVED);
        photo.setModeratedBy(adminUsername);
        return HallOfHappinessPhotoResponse.forAdmin(photoRepository.save(photo));
    }

    @CacheEvict(cacheNames = "hallOfHappiness", allEntries = true)
    @Transactional
    public HallOfHappinessPhotoResponse reject(Long id, String adminUsername) {
        HallOfHappinessPhoto photo = requirePhoto(id);
        requireStatus(photo, HallOfHappinessPhotoStatus.CUSTOMER_UPLOAD,
                HallOfHappinessPhotoStatus.PENDING_REVIEW,
                HallOfHappinessPhotoStatus.PENDING,
                HallOfHappinessPhotoStatus.APPROVED,
                HallOfHappinessPhotoStatus.UNPUBLISHED);
        photo.setStatus(HallOfHappinessPhotoStatus.REJECTED);
        photo.setModeratedBy(adminUsername);
        return HallOfHappinessPhotoResponse.forAdmin(photoRepository.save(photo));
    }

    @CacheEvict(cacheNames = "hallOfHappiness", allEntries = true)
    @Transactional
    public HallOfHappinessPhotoResponse publish(Long id, String adminUsername) {
        HallOfHappinessPhoto photo = requirePhoto(id);
        requireStatus(photo, HallOfHappinessPhotoStatus.APPROVED);
        if (photo.getConsentStatus() != HallOfHappinessConsentStatus.GRANTED) {
            throw new IllegalStateException("customer_consent_required");
        }
        photo.setStatus(HallOfHappinessPhotoStatus.PUBLISHED);
        photo.setPublishedAt(Instant.now());
        photo.setModeratedBy(adminUsername);
        return HallOfHappinessPhotoResponse.forAdmin(photoRepository.save(photo));
    }

    @CacheEvict(cacheNames = "hallOfHappiness", allEntries = true)
    @Transactional
    public HallOfHappinessPhotoResponse unpublish(Long id, String adminUsername) {
        HallOfHappinessPhoto photo = requirePhoto(id);
        requireStatus(photo, HallOfHappinessPhotoStatus.PUBLISHED);
        photo.setStatus(HallOfHappinessPhotoStatus.UNPUBLISHED);
        photo.setModeratedBy(adminUsername);
        return HallOfHappinessPhotoResponse.forAdmin(photoRepository.save(photo));
    }

    @CacheEvict(cacheNames = "hallOfHappiness", allEntries = true)
    @Transactional
    public HallOfHappinessPhotoResponse remove(Long id, String adminUsername) {
        HallOfHappinessPhoto photo = requirePhoto(id);
        if (photo.getStatus() == HallOfHappinessPhotoStatus.REMOVED) {
            throw new IllegalStateException("photo_removed");
        }
        photo.setStatus(HallOfHappinessPhotoStatus.REMOVED);
        photo.setRemovedAt(Instant.now());
        photo.setModeratedBy(adminUsername);
        imageStorageService.deleteImageByUrl(photo.getImageUrl());
        imageStorageService.deleteImageByUrl(photo.getThumbnailUrl());
        return HallOfHappinessPhotoResponse.forAdmin(photoRepository.save(photo));
    }

    @CacheEvict(cacheNames = "hallOfHappiness", allEntries = true)
    @Transactional
    public HallOfHappinessPhotoResponse setConsent(Long id, String phone, boolean granted) {
        Long customerId = userRepository.findByPhone(phone)
                .orElseThrow(() -> new IllegalArgumentException("customer_not_found"))
                .getId();
        HallOfHappinessPhoto photo = photoRepository.findByIdAndCustomerId(id, customerId)
                .orElseThrow(() -> new IllegalArgumentException("photo_not_found"));
        if (photo.getStatus() == HallOfHappinessPhotoStatus.REMOVED) {
            throw new IllegalStateException("photo_removed");
        }
        if (granted) {
            photo.setConsentStatus(HallOfHappinessConsentStatus.GRANTED);
            photo.setConsentGrantedAt(Instant.now());
        } else {
            photo.setConsentStatus(HallOfHappinessConsentStatus.REVOKED);
            photo.setConsentGrantedAt(null);
            if (photo.getStatus() == HallOfHappinessPhotoStatus.PUBLISHED) {
                photo.setStatus(HallOfHappinessPhotoStatus.UNPUBLISHED);
            }
        }
        return HallOfHappinessPhotoResponse.forCustomer(photoRepository.save(photo));
    }

    @CacheEvict(cacheNames = "hallOfHappiness", allEntries = true)
    @Transactional
    public HallOfHappinessPhotoResponse withdrawCustomerPhoto(Long id, String phone) {
        Long customerId = userRepository.findByPhone(phone)
                .orElseThrow(() -> new IllegalArgumentException("customer_not_found"))
                .getId();
        HallOfHappinessPhoto photo = photoRepository.findByIdAndCustomerId(id, customerId)
                .orElseThrow(() -> new IllegalArgumentException("photo_not_found"));
        if (photo.getStatus() == HallOfHappinessPhotoStatus.PUBLISHED) {
            throw new IllegalStateException("published_photo_cannot_be_withdrawn");
        }
        if (photo.getStatus() == HallOfHappinessPhotoStatus.REMOVED
                || photo.getStatus() == HallOfHappinessPhotoStatus.WITHDRAWN) {
            throw new IllegalStateException("photo_removed");
        }
        photo.setStatus(HallOfHappinessPhotoStatus.WITHDRAWN);
        photo.setConsentStatus(HallOfHappinessConsentStatus.REVOKED);
        photo.setConsentGrantedAt(null);
        photo.setRemovedAt(Instant.now());
        imageStorageService.deleteImageByUrl(photo.getImageUrl());
        imageStorageService.deleteImageByUrl(photo.getThumbnailUrl());
        return HallOfHappinessPhotoResponse.forCustomer(photoRepository.save(photo));
    }

    private PartyOrder requireCompletedOrder(Long orderId) {
        PartyOrder order = partyOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("party_order_not_found"));
        if (order.getStatus() != PartyOrderStatus.COMPLETED || order.getUserId() == null) {
            throw new IllegalArgumentException("party_order_must_be_completed");
        }

        return order;
    }

    private User customer(String phone) {
        return userRepository.findByPhone(phone)
                .orElseThrow(() -> new IllegalArgumentException("customer_not_found"));
    }

    private HallOfHappinessPhoto saveCustomerPhoto(
            PartyOrder order, User customer, MultipartFile file, String caption, String folder,
            HallOfHappinessSubmission submission) {
        validateFile(file);
        byte[] image = optimize(file, 1600, 0.86);
        byte[] thumbnail = optimize(image, 720, 0.80);
        String imageUrl = imageStorageService.uploadImage(image, folder + "/original", "image/jpeg");
        String thumbnailUrl = imageStorageService.uploadImage(thumbnail, folder + "/thumbnail", "image/jpeg");
        return photoRepository.save(HallOfHappinessPhoto.builder()
                .partyOrder(order)
                .submission(submission)
                .customerId(customer.getId())
                .imageUrl(imageUrl)
                .thumbnailUrl(thumbnailUrl)
                .caption(trimCaption(caption))
                .status(HallOfHappinessPhotoStatus.PENDING_REVIEW)
                .consentStatus(HallOfHappinessConsentStatus.GRANTED)
                .consentGrantedAt(Instant.now())
                .createdBy("CUSTOMER:" + customer.getId())
                .build());
    }

    private String orderFolder(PartyOrder order) {
        return "hall-of-happiness/" + locationFolder(order) + "/" + order.getId();
    }

    private String customerFolder(PartyOrder order) {
        return orderFolder(order) + "/customer";
    }

    private String locationFolder(PartyOrder order) {
        String locationName = order.getLocation() == null ? null : order.getLocation().getName();
        if (locationName == null || locationName.isBlank()) {
            return "unknown-location";
        }

        String normalized = Normalizer.normalize(locationName, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        return normalized.isBlank() ? "unknown-location" : normalized;
    }

    private HallOfHappinessPhoto requirePhoto(Long id) {
        return photoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("photo_not_found"));
    }

    private void requireStatus(HallOfHappinessPhoto photo, HallOfHappinessPhotoStatus... allowed) {
        for (HallOfHappinessPhotoStatus status : allowed) {
            if (photo.getStatus() == status) return;
        }
        throw new IllegalStateException("invalid_photo_transition");
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("image_required");
        if (file.getSize() > MAX_FILE_SIZE) throw new IllegalArgumentException("image_too_large");
    }

    private byte[] optimize(MultipartFile file, int size, double quality) {
        try (InputStream input = file.getInputStream();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            return writeOptimized(ImageIO.read(input), size, quality, output);
        } catch (IOException | RuntimeException ex) {
            throw new IllegalArgumentException("image_processing_failed: image could not be decoded", ex);
        }
    }

    private byte[] optimize(byte[] source, int size, double quality) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            return writeOptimized(ImageIO.read(new ByteArrayInputStream(source)), size, quality, output);
        } catch (IOException | RuntimeException ex) {
            throw new IllegalArgumentException("image_processing_failed: image could not be decoded", ex);
        }
    }

    private byte[] writeOptimized(
            BufferedImage source, int size, double quality, ByteArrayOutputStream output) throws IOException {
        if (source == null) {
            throw new IOException("unsupported_or_corrupt_image");
        }
        Thumbnails.of(source)
                .size(size, size)
                .keepAspectRatio(true)
                .outputFormat("jpeg")
                .outputQuality(quality)
                .toOutputStream(output);
        return output.toByteArray();
    }

    private String trimCaption(String caption) {
        if (caption == null) return null;
        String value = caption.trim();
        return value.isEmpty() ? null : value;
    }

    private int safePage(int page) {
        return Math.max(0, page);
    }

    private int safeSize(int size) {
        return Math.max(1, Math.min(MAX_PAGE_SIZE, size));
    }

}
