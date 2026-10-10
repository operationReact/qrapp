package com.broandbro.qrapp.partnerfinance.repository;

import com.broandbro.qrapp.partnerfinance.entity.PartnerCommissionAgreement;
import com.broandbro.qrapp.partnerfinance.enums.AgreementStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PartnerCommissionAgreementRepository extends JpaRepository<PartnerCommissionAgreement, Long> {
    List<PartnerCommissionAgreement> findByPartnerIdOrderByEffectiveFromDescIdDesc(Long partnerId);

    List<PartnerCommissionAgreement> findByPartnerIdAndStatusOrderByEffectiveFromAscIdAsc(Long partnerId, AgreementStatus status);

    Optional<PartnerCommissionAgreement> findByIdAndPartnerId(Long id, Long partnerId);
}