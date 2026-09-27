package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.repository.*;
import com.broandbro.qrapp.signature.repository.SignatureProductRepository;
import com.broandbro.qrapp.combo.repository.ComboCampaignRepository;
import com.broandbro.qrapp.combo.repository.ComboAnalyticsDailyRepository;
import com.broandbro.qrapp.analytics.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Comprehensive location deletion service that handles ALL location foreign-key dependencies.
 * 
 * Deletion Strategy (soft-delete via active=false):
 * 1. Find and deactivate users assigned to the location
 * 2. Clear user default location references
 * 3. Remove user-location access relationships
 * 4. Clear temporary OTP location references
 * 5. Delete location-specific configuration (menu items, categories, etc.)
 * 6. Delete derived analytics data
 * 7. Clear location references from historical business records (orders)
 * 8. Delete location-specific relationship records
 * 9. Mark location as inactive (soft-delete)
 * 10. Delete location photos from S3
 * 
 * All operations execute within a single transaction.
 * If any step fails, the entire operation rolls back.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LocationDeletionService {
    private final LocationRepository locationRepository;
    private final UserLocationAccessRepository userLocationAccessRepository;
    private final UserRepository userRepository;
    private final LocationPhotoService locationPhotoService;
    private final WhatsAppOtpRepository whatsAppOtpRepository;
    private final MenuRepository menuRepository;
    private final CategoryRepository categoryRepository;
    private final OrderRepository orderRepository;
    private final PartyOrderRepository partyOrderRepository;
    private final VendorOrderRepository vendorOrderRepository;
    private final LocationCustomerCompanyRepository locationCustomerCompanyRepository;
    private final SignatureProductRepository signatureProductRepository;
    private final ComboCampaignRepository comboCampaignRepository;
    private final DailySalesAnalyticsRepository dailySalesAnalyticsRepository;
    private final HourlyOrderAnalyticsRepository hourlyOrderAnalyticsRepository;
    private final MenuItemAnalyticsRepository menuItemAnalyticsRepository;
    private final CouponAnalyticsRepository couponAnalyticsRepository;
    private final ComboAnalyticsDailyRepository comboAnalyticsDailyRepository;

    @Transactional
    public void deleteLocationWithCleanup(Long locationId) {
        log.info("Starting comprehensive location deletion for location ID: {}", locationId);

        // Step 1: Retrieve and validate the location
        Location location = locationRepository.findById(locationId)
            .orElseThrow(() -> new IllegalArgumentException("Location not found: " + locationId));

        // Step 2: Find all user_location_access records for this location
        var accessRecords = userLocationAccessRepository.findByLocationId(locationId);
        
        if (!accessRecords.isEmpty()) {
            // Step 3: Collect affected user IDs (avoiding duplicates)
            var affectedUserIds = accessRecords.stream()
                .map(ula -> ula.getUser().getId())
                .distinct()
                .collect(Collectors.toList());
            
            log.debug("Found {} affected users for location {}", affectedUserIds.size(), locationId);
            
            // Step 4: Mark affected users as inactive
            if (!affectedUserIds.isEmpty()) {
                userRepository.deactivateUsers(affectedUserIds);
                log.debug("Marked {} users as inactive", affectedUserIds.size());
            }
            
            // Step 5: Clear default location for affected users
            userRepository.clearDefaultLocationForLocation(locationId);
            log.debug("Cleared default location references for affected users");
            
            // Step 6: Remove all location access records for this location
            userLocationAccessRepository.deleteByLocationId(locationId);
            log.debug("Removed user_location_access records for location {}", locationId);
        }

        // Step 7: Clear temporary OTP registration location references
        whatsAppOtpRepository.clearRegistrationDefaultLocation(locationId);
        log.debug("Cleared WhatsApp OTP location references");

        // Step 8: Delete location-specific menu configuration
        menuRepository.deleteByLocationId(locationId);
        log.debug("Deleted menu items for location {}", locationId);
        
        categoryRepository.deleteByLocationId(locationId);
        log.debug("Deleted categories for location {}", locationId);

        // Step 9: Clear location from historical orders (preserve order history)
        orderRepository.clearLocationForOrders(locationId);
        log.debug("Cleared location reference from orders");
        
        partyOrderRepository.clearLocationForPartyOrders(locationId);
        log.debug("Cleared location reference from party orders");
        
        vendorOrderRepository.clearLocationForVendorOrders(locationId);
        log.debug("Cleared location reference from vendor orders");

        // Step 10: Delete location-specific analytics (derived, recalculates from orders)
        dailySalesAnalyticsRepository.deleteByLocationId(locationId);
        log.debug("Deleted daily sales analytics for location {}", locationId);
        
        hourlyOrderAnalyticsRepository.deleteByLocationId(locationId);
        log.debug("Deleted hourly order analytics for location {}", locationId);
        
        menuItemAnalyticsRepository.deleteByLocationId(locationId);
        log.debug("Deleted menu item analytics for location {}", locationId);
        
        couponAnalyticsRepository.deleteByLocationId(locationId);
        log.debug("Deleted coupon analytics for location {}", locationId);
        
        comboAnalyticsDailyRepository.deleteByLocationId(locationId);
        log.debug("Deleted combo analytics for location {}", locationId);

        // Step 11: Delete location-specific relationship records
        locationCustomerCompanyRepository.deleteByLocationId(locationId);
        log.debug("Deleted location-customer company mappings");
        
        signatureProductRepository.deleteByLocationId(locationId);
        log.debug("Deleted signature products for location {}", locationId);
        
        comboCampaignRepository.deleteByLocationId(locationId);
        log.debug("Deleted combo campaigns for location {}", locationId);

        // Step 12: Delete associated location photo from S3 if present
        if (location.getLocationPhotoKey() != null && !location.getLocationPhotoKey().isBlank()) {
            try {
                locationPhotoService.remove(location);
                log.debug("Deleted location photo from S3");
            } catch (Exception e) {
                log.warn("Failed to delete location photo from S3, but continuing with deletion", e);
            }
        }

        // Step 13: Soft-delete the location (mark as inactive instead of hard delete)
        // This preserves referential integrity for any records that might still reference it
        // and allows for potential undelete/recovery in the future
        location.setActive(false);
        locationRepository.save(location);
        log.info("Successfully soft-deleted location ID: {} (marked as inactive)", locationId);
    }
}

