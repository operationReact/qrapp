package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import com.broandbro.qrapp.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PartnerAccessService {
    private final UserRepository userRepository;
    private final PartnerUserRepository partnerUserRepository;
    private final PartnerLocationRepository partnerLocationRepository;
    private final UserLocationAccessRepository userLocationAccessRepository;
    private final OrderRepository orderRepository;

    public User currentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AccessDeniedException("partner_authentication_required");
        }
        return userRepository.findByPhone(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("partner_authentication_required"));
    }

    public PartnerUser currentAssociation(Authentication authentication) {
        User user = currentUser(authentication);
        if (user.getRole() != UserRole.PARTNER_ADMIN && user.getRole() != UserRole.PARTNER_USER) {
            throw new AccessDeniedException("partner_role_required");
        }
        if (Boolean.TRUE.equals(user.getMustChangePassword())) {
            throw new AccessDeniedException("partner_password_change_required");
        }
        return partnerUserRepository.findByUserIdAndActiveTrue(user.getId())
                .filter(link -> link.getPartner().getStatus() == PartnerStatus.ACTIVE)
                .orElseThrow(() -> new AccessDeniedException("partner_access_denied"));
    }

    public PartnerLocation accessibleLocation(Long locationId, Authentication authentication) {
        PartnerUser association = currentAssociation(authentication);
        return partnerLocationRepository.findByPartnerIdAndLocationIdAndStatus(
                        association.getPartner().getId(), locationId, PartnerRelationshipStatus.ACTIVE)
                .orElseThrow(() -> new AccessDeniedException("partner_location_access_denied"));
    }

    public List<PartnerLocation> accessibleLocations(Authentication authentication) {
        PartnerUser association = currentAssociation(authentication);
        return partnerLocationRepository.findByPartnerIdAndStatusOrderByStatusDescEffectiveFromDesc(
                association.getPartner().getId(), PartnerRelationshipStatus.ACTIVE);
    }

    public boolean canManageUsers(Authentication authentication) {
        return currentAssociation(authentication).getUser().getRole() == UserRole.PARTNER_ADMIN;
    }

    public com.broandbro.qrapp.entity.Order requireOrderAccess(Long orderId, Authentication authentication) {
        PartnerLocation location = accessibleLocation(
                orderRepository.findById(orderId).map(order -> order.getLocation() == null ? null : order.getLocation().getId())
                        .orElseThrow(() -> new AccessDeniedException("partner_order_access_denied")), authentication);
        return orderRepository.findByIdWithLocation(orderId)
                .filter(order -> order.getLocation() != null && order.getLocation().getId().equals(location.getLocation().getId()))
                .orElseThrow(() -> new AccessDeniedException("partner_order_access_denied"));
    }

    public Partner getCurrentPartner(Authentication authentication) {
        return currentAssociation(authentication).getPartner();
    }

    public List<User> activeUsersForLocation(Long locationId, Authentication authentication) {
        Partner partner = getCurrentPartner(authentication);
        PartnerLocation location = accessibleLocation(locationId, authentication);
        List<Long> partnerUserIds = partnerUserRepository.findByPartnerIdOrderByUser_NameAsc(partner.getId()).stream()
                .filter(link -> Boolean.TRUE.equals(link.getActive()))
                .map(link -> link.getUser().getId()).toList();
        return userLocationAccessRepository.findByLocationIdAndActiveTrueAndLocationActiveTrue(location.getLocation().getId())
                .stream().map(UserLocationAccess::getUser)
                .filter(user -> partnerUserIds.contains(user.getId()))
                .toList();
    }
}
