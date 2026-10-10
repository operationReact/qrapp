package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    @EntityGraph(attributePaths = {"defaultLocation", "customerCompany"})
    Optional<User> findByPhone(String phone);

    @Override
    @EntityGraph(attributePaths = {"defaultLocation", "customerCompany"})
    List<User> findAll();

    @EntityGraph(attributePaths = {"defaultLocation", "customerCompany"})
    @Query("""
            SELECT DISTINCT u
            FROM User u
            LEFT JOIN UserLocationAccess access
                ON access.user = u AND access.active = true
            WHERE u.defaultLocation.id = :locationId
               OR access.location.id = :locationId
            ORDER BY u.name ASC, u.id ASC
            """)
    List<User> findAllByLocationId(@Param("locationId") Long locationId);

    @EntityGraph(attributePaths = {"defaultLocation", "customerCompany"})
    Optional<User> findByTokenAndActiveTrue(String token);

    /** Returns a page of user IDs — used by {@code UserPreferenceScheduler} for batched rebuilds. */
    @Query("SELECT u.id FROM User u ORDER BY u.id ASC")
    List<Long> findAllIds(Pageable pageable);

    /** Deactivate multiple users by ID. */
    @Modifying
    @Query("UPDATE User u SET u.active = false WHERE u.id IN :userIds")
    void deactivateUsers(@Param("userIds") List<Long> userIds);

    /** Clear default location for users whose default location is being deleted. */
    @Modifying
    @Query("UPDATE User u SET u.defaultLocation = null WHERE u.defaultLocation.id = :locationId")
    void clearDefaultLocationForLocation(@Param("locationId") Long locationId);
}
