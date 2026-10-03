package com.broandbro.qrapp.foodcourt.service;

import com.broandbro.qrapp.foodcourt.dto.LandlordRentObligationResponse;
import com.broandbro.qrapp.foodcourt.entity.LandlordRentObligation;
import com.broandbro.qrapp.foodcourt.entity.PropertyLease;
import com.broandbro.qrapp.foodcourt.enums.LandlordRentStatus;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtNotFoundException;
import com.broandbro.qrapp.foodcourt.repository.LandlordRentObligationRepository;
import com.broandbro.qrapp.foodcourt.repository.PropertyLeaseRepository;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LandlordRentService {
    private final LandlordRentObligationRepository obligationRepository;
    private final PropertyLeaseRepository propertyLeaseRepository;

    @Transactional
    public List<LandlordRentObligationResponse> generate(UUID foodCourtId, int year, int month, String actor) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("month_must_be_between_1_and_12");
        }
        LocalDate first = LocalDate.of(year, month, 1);
        for (PropertyLease lease : propertyLeaseRepository.findByFoodCourt(foodCourtId)) {
            if (lease.getStatus() != com.broandbro.qrapp.foodcourt.enums.LeaseStatus.ACTIVE
                    || lease.getMonthlyRent() == null
                    || obligationRepository.existsByPropertyLeaseIdAndBillingYearAndBillingMonth(
                    lease.getId(), year, month)) {
                continue;
            }
            int dueDay = lease.getRentDueDay() == null ? 1 : Math.min(lease.getRentDueDay(), first.lengthOfMonth());
            obligationRepository.save(LandlordRentObligation.builder()
                    .foodCourtId(foodCourtId)
                    .propertyLeaseId(lease.getId())
                    .billingYear(year)
                    .billingMonth(month)
                    .dueDate(first.withDayOfMonth(Math.max(1, dueDay)))
                    .expectedAmount(lease.getMonthlyRent())
                    .paidAmount(BigDecimal.ZERO)
                    .status(LandlordRentStatus.PENDING)
                    .createdBy(actor)
                    .updatedBy(actor)
                    .build());
        }
        return list(foodCourtId);
    }

    @Transactional(readOnly = true)
    public List<LandlordRentObligationResponse> list(UUID foodCourtId) {
        return obligationRepository.findByFoodCourtIdOrderByBillingYearDescBillingMonthDesc(foodCourtId)
                .stream().map(this::toResponse).toList();
    }

    private LandlordRentObligationResponse toResponse(LandlordRentObligation item) {
        BigDecimal outstanding = item.getExpectedAmount().subtract(item.getPaidAmount());
        LandlordRentStatus status = item.getStatus();
        if (outstanding.signum() > 0 && BusinessTime.today().isAfter(item.getDueDate())) {
            status = LandlordRentStatus.OVERDUE;
        }
        return new LandlordRentObligationResponse(item.getId(), item.getFoodCourtId(),
                item.getPropertyLeaseId(), item.getBillingYear(), item.getBillingMonth(),
                item.getDueDate(), item.getExpectedAmount(), item.getPaidAmount(),
                outstanding, status);
    }
}
