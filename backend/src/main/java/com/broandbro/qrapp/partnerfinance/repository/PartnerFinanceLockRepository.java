package com.broandbro.qrapp.partnerfinance.repository;

import com.broandbro.qrapp.entity.Partner;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/** Serialises finance mutations (agreements, settlement generation) per partner. */
public interface PartnerFinanceLockRepository extends Repository<Partner, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Partner p WHERE p.id = :partnerId")
    Optional<Partner> lockPartner(@Param("partnerId") Long partnerId);

    @Query("SELECT p FROM Partner p WHERE p.id = :partnerId")
    Optional<Partner> findPartner(@Param("partnerId") Long partnerId);
}