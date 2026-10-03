package com.broandbro.qrapp.foodcourt.security;

import com.broandbro.qrapp.foodcourt.entity.FoodCourtAccess;
import com.broandbro.qrapp.foodcourt.enums.FoodCourtAccessStatus;
import com.broandbro.qrapp.foodcourt.enums.FoodCourtRole;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtAccessDeniedException;
import com.broandbro.qrapp.foodcourt.repository.FoodCourtAccessRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Resolves and enforces Food Court-specific access using opaque user ids.
 *
 * <p>Two access tiers are combined: platform-wide admin roles
 * ({@code ROLE_SUPER_ADMIN}, {@code ROLE_ADMIN}, {@code ROLE_SUPERUSER}) grant
 * unrestricted cross-food-court access; everyone else is scoped to the food
 * courts for which they hold an active {@link FoodCourtAccess} grant keyed by
 * their opaque user id (the authentication principal name). All food court
 * scoping is enforced server-side here, never trusted from the request.</p>
 */
@Service
@RequiredArgsConstructor
public class FoodCourtAccessService {

    /** Platform roles that bypass per-food-court scoping. */
    private static final Set<String> GLOBAL_ROLES =
            Set.of("ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_SUPERUSER");

    private final FoodCourtAccessRepository accessRepository;

    /** The opaque user id of the authenticated caller (the principal name). */
    public String currentUserId(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new FoodCourtAccessDeniedException("authentication_required");
        }
        return auth.getName();
    }

    public boolean isGlobalAdmin(Authentication auth) {
        if (auth == null || auth.getAuthorities() == null) {
            return false;
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(GLOBAL_ROLES::contains);
    }

    /**
     * The set of food court ids the caller may access, or {@link Optional#empty()}
     * for unrestricted global admins. A present empty set means "no access to
     * anything".
     */
    @Transactional(readOnly = true)
    public Optional<Set<UUID>> resolveScope(Authentication auth) {
        if (isGlobalAdmin(auth)) {
            return Optional.empty();
        }
        List<UUID> ids = accessRepository.findAccessibleFoodCourtIds(currentUserId(auth));
        return Optional.of(new HashSet<>(ids));
    }

    /** True when the given scope permits the food court (empty scope = all). */
    public boolean isWithinScope(Optional<Set<UUID>> scope, UUID foodCourtId) {
        return scope.isEmpty() || scope.get().contains(foodCourtId);
    }

    /** Throws {@link FoodCourtAccessDeniedException} if the caller cannot access the food court. */
    @Transactional(readOnly = true)
    public void requireAccess(Authentication auth, UUID foodCourtId) {
        if (!isWithinScope(resolveScope(auth), foodCourtId)) {
            throw new FoodCourtAccessDeniedException("food_court_access_denied");
        }
    }

    /**
     * Requires the caller to hold at least {@code minimumRole} at the food court
     * (global admins always pass). Used to gate mutating or financial actions.
     */
    @Transactional(readOnly = true)
    public void requireRole(Authentication auth, UUID foodCourtId, FoodCourtRole minimumRole) {
        if (isGlobalAdmin(auth)) {
            return;
        }
        FoodCourtAccess access = accessRepository
                .findByFoodCourtIdAndUserId(foodCourtId, currentUserId(auth))
                .filter(a -> a.getStatus() == FoodCourtAccessStatus.ACTIVE)
                .orElseThrow(() -> new FoodCourtAccessDeniedException("food_court_access_denied"));
        if (rank(access.getRole()) < rank(minimumRole)) {
            throw new FoodCourtAccessDeniedException("insufficient_food_court_role");
        }
    }

    /** Higher rank = more privilege. */
    private int rank(FoodCourtRole role) {
        return switch (role) {
            case FOODCOURT_SUPER_ADMIN -> 6;
            case FOODCOURT_ADMIN -> 5;
            case FOODCOURT_MANAGER, FOODCOURT_FINANCE, FOODCOURT_OPERATIONS -> 3;
            case FOODCOURT_VIEWER -> 1;
        };
    }
}
