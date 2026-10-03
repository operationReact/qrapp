package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.LandlordRentObligation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LandlordRentObligationRepository extends JpaRepository<LandlordRentObligation, UUID> {
    boolean existsByPropertyLeaseIdAndBillingYearAndBillingMonth(
            UUID propertyLeaseId, Integer billingYear, Integer billingMonth);

    List<LandlordRentObligation> findByFoodCourtIdOrderByBillingYearDescBillingMonthDesc(UUID foodCourtId);
}
