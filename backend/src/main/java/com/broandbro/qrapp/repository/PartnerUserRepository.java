package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.PartnerUser;
import org.springframework.data.jpa.repository.*;

import java.util.List;
import java.util.Optional;

public interface PartnerUserRepository extends JpaRepository<PartnerUser, Long> {
    @EntityGraph(attributePaths = {"partner", "user"})
    List<PartnerUser> findByPartnerIdOrderByUser_NameAsc(Long partnerId);

    Optional<PartnerUser> findByPartnerIdAndUserId(Long partnerId, Long userId);
    Optional<PartnerUser> findByUserIdAndActiveTrue(Long userId);
    long countByPartnerIdAndActiveTrue(Long partnerId);
}
