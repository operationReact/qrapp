package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.*;
import org.springframework.data.jpa.repository.*;
import java.util.List;
import java.util.Optional;

public interface UserLocationAccessRepository extends JpaRepository<UserLocationAccess, Long> {
    Optional<UserLocationAccess> findByUserIdAndLocationId(Long userId, Long locationId);
    @EntityGraph(attributePaths = "location")
    List<UserLocationAccess> findByUserIdAndActiveTrueAndLocationActiveTrueOrderByLocationNameAsc(Long userId);
    @EntityGraph(attributePaths = "location")
    List<UserLocationAccess> findByUserIdOrderByLocationNameAsc(Long userId);
    List<UserLocationAccess> findByLocationId(Long locationId);
    void deleteByUserIdAndLocationId(Long userId, Long locationId);

    /** Delete all access records for a specific location. */
    @Modifying
    void deleteByLocationId(Long locationId);
}
