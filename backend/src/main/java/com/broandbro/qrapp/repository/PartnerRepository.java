package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Partner;
import com.broandbro.qrapp.entity.PartnerStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PartnerRepository extends JpaRepository<Partner, Long> {
    Optional<Partner> findByPartnerCodeIgnoreCase(String partnerCode);
    boolean existsByPartnerCodeIgnoreCase(String partnerCode);
    boolean existsByPartnerCodeIgnoreCaseAndIdNot(String partnerCode, Long id);
    List<Partner> findAllByOrderByDisplayNameAsc();
    List<Partner> findAllByStatusOrderByDisplayNameAsc(PartnerStatus status);
}
