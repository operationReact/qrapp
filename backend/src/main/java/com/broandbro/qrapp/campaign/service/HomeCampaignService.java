package com.broandbro.qrapp.campaign.service;

import com.broandbro.qrapp.campaign.dto.HomeCampaignFeedResponse;
import com.broandbro.qrapp.campaign.dto.HomeCampaignRequest;
import com.broandbro.qrapp.campaign.dto.HomeCampaignResponse;
import com.broandbro.qrapp.campaign.entity.HomeCampaign;
import com.broandbro.qrapp.campaign.repository.HomeCampaignRepository;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.HomeCampaignTargetType;
import com.broandbro.qrapp.enums.HomeCampaignType;
import com.broandbro.qrapp.exception.FileTooLargeException;
import com.broandbro.qrapp.exception.InvalidImageException;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.storage.ImageStorageService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * CMS-style CRUD + customer-feed service for Home page campaigns (HERO,
 * DISCOVERY, PROMOTION). Mirrors {@code ComboCampaignService}'s location-scope
 * conventions: {@link Optional#empty()} scope = unrestricted (SUPER_ADMIN /
 * "All Locations"), a present list restricts reads/writes to those location
 * IDs (an empty list sees nothing).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HomeCampaignService {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024L;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");

    private final HomeCampaignRepository repository;
    private final LocationRepository locationRepository;
    private final LocationAccessService locationAccessService;
    private final ImageStorageService imageStorage;

    // ── Admin CRUD ───────────────────────────────────────────────────────────

    @Transactional
    @CacheEvict(cacheNames = "homeCampaigns", allEntries = true)
    public HomeCampaignResponse create(HomeCampaignRequest req, User actor, String actorName) {
        validateCampaignRequest(req);
        Location location = resolveLocationForWrite(req.locationId(), actor);
        HomeCampaign campaign = HomeCampaign.builder()
                .location(location)
                .type(req.type())
                .badge(req.badge())
                .title(req.title())
                .subtitle(req.subtitle())
                .ctaLabel(req.ctaLabel())
                .imageUrl(req.imageUrl())
                .mobileImageUrl(req.mobileImageUrl())
                .targetType(req.targetType() == null ? HomeCampaignTargetType.NONE : req.targetType())
                .targetId(req.targetId())
                .visualVariant(req.visualVariant())
                .stylePreset(req.stylePreset())
                .titleTypographyPreset(req.titleTypographyPreset())
                .subtitleTypographyPreset(req.subtitleTypographyPreset())
                .ctaTypographyPreset(req.ctaTypographyPreset())
                .animationPreset(req.animationPreset())
                .animationIntensity(req.animationIntensity())
                .displayOrder(req.displayOrder() == null ? 0 : req.displayOrder())
                .isActive(req.isActive() == null || req.isActive())
                .startsAt(req.startsAt())
                .endsAt(req.endsAt())
                .createdBy(actorName)
                .updatedBy(actorName)
                .build();
        campaign = repository.save(campaign);
        log.info("Created home campaign '{}' (id={}, type={}) by {}", campaign.getTitle(), campaign.getId(), campaign.getType(), actorName);
        return toResponse(campaign);
    }

    @Transactional
    @CacheEvict(cacheNames = "homeCampaigns", allEntries = true)
    public HomeCampaignResponse update(Long id, HomeCampaignRequest req, User actor, String actorName,
                                        Optional<List<Long>> locationScope) {
        validateCampaignRequest(req);
        HomeCampaign campaign = findActiveInScope(id, locationScope);
        Location location = resolveLocationForWrite(req.locationId(), actor);
        campaign.setLocation(location);
        campaign.setType(req.type());
        campaign.setBadge(req.badge());
        campaign.setTitle(req.title());
        campaign.setSubtitle(req.subtitle());
        campaign.setCtaLabel(req.ctaLabel());
        if (req.imageUrl() != null) campaign.setImageUrl(req.imageUrl());
        if (req.mobileImageUrl() != null) campaign.setMobileImageUrl(req.mobileImageUrl());
        campaign.setTargetType(req.targetType() == null ? HomeCampaignTargetType.NONE : req.targetType());
        campaign.setTargetId(req.targetId());
        campaign.setVisualVariant(req.visualVariant());
        campaign.setStylePreset(req.stylePreset());
        campaign.setTitleTypographyPreset(req.titleTypographyPreset());
        campaign.setSubtitleTypographyPreset(req.subtitleTypographyPreset());
        campaign.setCtaTypographyPreset(req.ctaTypographyPreset());
        campaign.setAnimationPreset(req.animationPreset());
        campaign.setAnimationIntensity(req.animationIntensity());
        if (req.displayOrder() != null) campaign.setDisplayOrder(req.displayOrder());
        if (req.isActive() != null) campaign.setIsActive(req.isActive());
        campaign.setStartsAt(req.startsAt());
        campaign.setEndsAt(req.endsAt());
        campaign.setUpdatedBy(actorName);
        return toResponse(repository.save(campaign));
    }

    @Transactional
    @CacheEvict(cacheNames = "homeCampaigns", allEntries = true)
    public HomeCampaignResponse setActive(Long id, boolean active, String actorName, Optional<List<Long>> locationScope) {
        HomeCampaign campaign = findActiveInScope(id, locationScope);
        campaign.setIsActive(active);
        campaign.setUpdatedBy(actorName);
        return toResponse(repository.save(campaign));
    }

    @Transactional
    @CacheEvict(cacheNames = "homeCampaigns", allEntries = true)
    public HomeCampaignResponse reorder(Long id, int displayOrder, String actorName, Optional<List<Long>> locationScope) {
        HomeCampaign campaign = findActiveInScope(id, locationScope);
        campaign.setDisplayOrder(displayOrder);
        campaign.setUpdatedBy(actorName);
        return toResponse(repository.save(campaign));
    }

    @Transactional
    @CacheEvict(cacheNames = "homeCampaigns", allEntries = true)
    public HomeCampaignResponse duplicate(Long id, String actorName, Optional<List<Long>> locationScope) {
        HomeCampaign source = findActiveInScope(id, locationScope);
        HomeCampaign copy = HomeCampaign.builder()
                .location(source.getLocation())
                .type(source.getType())
                .badge(source.getBadge())
                .title(source.getTitle() + " (Copy)")
                .subtitle(source.getSubtitle())
                .ctaLabel(source.getCtaLabel())
                .imageUrl(source.getImageUrl())
                .mobileImageUrl(source.getMobileImageUrl())
                .targetType(source.getTargetType())
                .targetId(source.getTargetId())
                .visualVariant(source.getVisualVariant())
                .stylePreset(source.getStylePreset())
                .titleTypographyPreset(source.getTitleTypographyPreset())
                .subtitleTypographyPreset(source.getSubtitleTypographyPreset())
                .ctaTypographyPreset(source.getCtaTypographyPreset())
                .animationPreset(source.getAnimationPreset())
                .animationIntensity(source.getAnimationIntensity())
                .displayOrder(source.getDisplayOrder())
                .isActive(false)
                .startsAt(source.getStartsAt())
                .endsAt(source.getEndsAt())
                .createdBy(actorName)
                .updatedBy(actorName)
                .build();
        return toResponse(repository.save(copy));
    }

    @Transactional
    @CacheEvict(cacheNames = "homeCampaigns", allEntries = true)
    public void delete(Long id, String actorName, Optional<List<Long>> locationScope) {
        HomeCampaign campaign = findActiveInScope(id, locationScope);
        campaign.setDeletedAt(Instant.now());
        campaign.setIsActive(false);
        campaign.setUpdatedBy(actorName);
        repository.save(campaign);
    }

    @Transactional(readOnly = true)
    public HomeCampaignResponse getById(Long id, Optional<List<Long>> locationScope) {
        return toResponse(findActiveInScope(id, locationScope));
    }

    @Transactional(readOnly = true)
    public List<HomeCampaignResponse> listAll(Optional<List<Long>> locationScope) {
        List<HomeCampaign> campaigns = isUnfiltered(locationScope)
                ? repository.findAllNonDeleted()
                : repository.findAllNonDeletedInScope(scopeIdsOrSentinel(locationScope));
        return campaigns.stream().map(this::toResponse).toList();
    }

    // ── Image upload ─────────────────────────────────────────────────────────

    @Transactional
    @CacheEvict(cacheNames = "homeCampaigns", allEntries = true)
    public HomeCampaignResponse uploadImage(Long id, MultipartFile file, boolean mobile, String actorName,
                                            Optional<List<Long>> locationScope) {
        validateImage(file);
        HomeCampaign campaign = findActiveInScope(id, locationScope);
        String folder = "home-campaigns/" + campaign.getId();
        ImageStorageService.StoredImage stored;
        try {
            String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
            stored = imageStorage.uploadImageWithKey(file.getBytes(), folder, contentType);
        } catch (IOException e) {
            throw new InvalidImageException("Could not read campaign image");
        }
        if (mobile) {
            deleteIfPresent(campaign.getMobileImageKey(), campaign.getMobileImageUrl());
            campaign.setMobileImageUrl(stored.url());
            campaign.setMobileImageKey(stored.key());
        } else {
            deleteIfPresent(campaign.getImageKey(), campaign.getImageUrl());
            campaign.setImageUrl(stored.url());
            campaign.setImageKey(stored.key());
        }
        campaign.setUpdatedBy(actorName);
        return toResponse(repository.save(campaign));
    }

    @Transactional
    @CacheEvict(cacheNames = "homeCampaigns", allEntries = true)
    public HomeCampaignResponse removeImage(Long id, boolean mobile, String actorName, Optional<List<Long>> locationScope) {
        HomeCampaign campaign = findActiveInScope(id, locationScope);
        if (mobile) {
            deleteIfPresent(campaign.getMobileImageKey(), campaign.getMobileImageUrl());
            campaign.setMobileImageUrl(null);
            campaign.setMobileImageKey(null);
        } else {
            deleteIfPresent(campaign.getImageKey(), campaign.getImageUrl());
            campaign.setImageUrl(null);
            campaign.setImageKey(null);
        }
        campaign.setUpdatedBy(actorName);
        return toResponse(repository.save(campaign));
    }

    private void deleteIfPresent(String key, String url) {
        if (key != null) {
            imageStorage.deleteLocationImageByKey(key);
        } else if (url != null) {
            imageStorage.deleteImageByUrl(url);
        }
    }

    private void validateCampaignRequest(HomeCampaignRequest req) {
        HomeCampaignTargetType targetType = req.targetType() == null
                ? HomeCampaignTargetType.NONE : req.targetType();
        String targetId = req.targetId() == null ? "" : req.targetId().trim();

        if (req.startsAt() != null && req.endsAt() != null && !req.endsAt().isAfter(req.startsAt())) {
            throw new IllegalArgumentException("ends_at_must_be_after_starts_at");
        }
        if ((targetType == HomeCampaignTargetType.CATEGORY
                || targetType == HomeCampaignTargetType.COMBO
                || targetType == HomeCampaignTargetType.EXTERNAL)
                && targetId.isBlank()) {
            throw new IllegalArgumentException("target_id_required");
        }
        if (targetType == HomeCampaignTargetType.COMBO
                && !Set.of("combos", "byoc").contains(targetId)) {
            throw new IllegalArgumentException("invalid_combo_target");
        }
        if (targetType == HomeCampaignTargetType.EXTERNAL) {
            try {
                URI uri = new URI(targetId);
                if (!Set.of("http", "https").contains(uri.getScheme())
                        || uri.getHost() == null) {
                    throw new IllegalArgumentException("invalid_external_target");
                }
            } catch (URISyntaxException e) {
                throw new IllegalArgumentException("invalid_external_target", e);
            }
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidImageException("Image must not be empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new FileTooLargeException("Image size exceeds maximum allowed 5 MB");
        }
        String contentType = file.getContentType();
        String name = file.getOriginalFilename();
        String extension = name == null || !name.contains(".")
                ? "" : name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        boolean matches = contentType != null && (
                (contentType.equalsIgnoreCase("image/jpeg") && Set.of("jpg", "jpeg").contains(extension))
                        || (contentType.equalsIgnoreCase("image/png") && extension.equals("png"))
                        || (contentType.equalsIgnoreCase("image/webp") && extension.equals("webp")));
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase(Locale.ROOT))
                || !ALLOWED_EXTENSIONS.contains(extension) || !matches) {
            throw new InvalidImageException("Invalid image type. Allowed: JPG, JPEG, PNG, WEBP");
        }
    }

    // ── Customer feed ────────────────────────────────────────────────────────

    /**
     * Returns the active, in-schedule campaigns visible to a customer at
     * {@code locationId} (or global-only when {@code locationId} is null),
     * grouped by rail. Cached briefly per location so admin changes (which
     * evict this cache) propagate without requiring a frontend deploy.
     */
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "homeCampaigns", key = "#locationId == null ? 'global' : #locationId")
    public HomeCampaignFeedResponse getPublicFeed(Long locationId) {
        Instant now = Instant.now();
        return new HomeCampaignFeedResponse(
                fetchPublic(HomeCampaignType.HERO, locationId, now),
                fetchPublic(HomeCampaignType.DISCOVERY, locationId, now),
                fetchPublic(HomeCampaignType.PROMOTION, locationId, now)
        );
    }

    private List<HomeCampaignResponse> fetchPublic(HomeCampaignType type, Long locationId, Instant now) {
        List<HomeCampaign> campaigns = locationId == null
                ? repository.findPublicActiveGlobalOnly(type, now)
                : repository.findPublicActive(type, locationId, now);
        return campaigns.stream().map(this::toResponse).toList();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private boolean isUnfiltered(Optional<List<Long>> locationScope) {
        return locationScope == null || locationScope.isEmpty();
    }

    private List<Long> scopeIdsOrSentinel(Optional<List<Long>> locationScope) {
        List<Long> ids = locationScope.get();
        return ids.isEmpty() ? List.of(-1L) : ids;
    }

    private HomeCampaign findActive(Long id) {
        return repository.findActiveById(id)
                .orElseThrow(() -> new EntityNotFoundException("Home campaign not found: " + id));
    }

    private HomeCampaign findActiveInScope(Long id, Optional<List<Long>> locationScope) {
        if (isUnfiltered(locationScope)) {
            return findActive(id);
        }
        List<Long> ids = locationScope.get();
        if (ids.isEmpty()) {
            throw new AccessDeniedException("location_access_denied");
        }
        findActive(id); // 404 if it does not exist at all
        return repository.findActiveByIdAndLocationIdIn(id, ids)
                .orElseThrow(() -> new AccessDeniedException("location_access_denied"));
    }

    /**
     * Resolves the owning location for a create/update. {@code null} requests
     * a GLOBAL campaign, which only cross-location (SUPER_ADMIN) callers may
     * create; scoped ADMIN/MANAGER callers must target a location they can
     * access. The requested locationId is never trusted blindly.
     */
    private Location resolveLocationForWrite(Long requestedLocationId, User actor) {
        if (requestedLocationId == null) {
            boolean global = locationAccessService.resolveDashboardLocationScope(actor, null).isEmpty();
            if (!global) {
                throw new AccessDeniedException("global_campaign_requires_super_admin");
            }
            return null;
        }
        locationAccessService.requireLocationAccess(actor, requestedLocationId);
        return locationRepository.findById(requestedLocationId)
                .filter(l -> Boolean.TRUE.equals(l.getActive()))
                .orElseThrow(() -> new IllegalArgumentException("location_not_found_or_inactive"));
    }

    private HomeCampaignResponse toResponse(HomeCampaign c) {
        return new HomeCampaignResponse(
                c.getId(), c.getType(),
                c.getLocation() != null ? c.getLocation().getId() : null,
                c.getLocation() != null ? c.getLocation().getName() : null,
                c.getBadge(), c.getTitle(), c.getSubtitle(), c.getCtaLabel(),
                c.getImageUrl(), c.getMobileImageUrl(),
                c.getTargetType(), c.getTargetId(), c.getVisualVariant(),
                c.getStylePreset(),
                c.getTitleTypographyPreset(), c.getSubtitleTypographyPreset(),
                c.getCtaTypographyPreset(), c.getAnimationPreset(), c.getAnimationIntensity(),
                c.getDisplayOrder(), c.getIsActive(), c.getStartsAt(), c.getEndsAt(),
                c.getCreatedBy(), c.getCreatedAt(), c.getUpdatedAt()
        );
    }
}
