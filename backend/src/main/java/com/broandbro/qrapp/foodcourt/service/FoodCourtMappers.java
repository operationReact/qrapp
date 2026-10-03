package com.broandbro.qrapp.foodcourt.service;

import com.broandbro.qrapp.foodcourt.dto.FoodCourtResponse;
import com.broandbro.qrapp.foodcourt.entity.FoodCourt;
import com.broandbro.qrapp.foodcourt.enums.LeaseStatus;
import com.broandbro.qrapp.foodcourt.repository.StallLeaseRepository;
import com.broandbro.qrapp.foodcourt.repository.StallRepository;

/**
 * Shared mapping helpers for the food court context. Kept stateless so both
 * services and tests can reuse them without constructing Spring beans.
 */
public final class FoodCourtMappers {

    private FoodCourtMappers() {
    }

    public static FoodCourtResponse toResponse(FoodCourt fc, long stallCount, long occupiedStalls) {
        return new FoodCourtResponse(
                fc.getId(), fc.getCode(), fc.getName(), fc.getAddressLine(), fc.getCity(),
                fc.getState(), fc.getPostalCode(), fc.getContactPhone(), fc.getTotalStalls(),
                stallCount, occupiedStalls, fc.getStatus(), fc.getNotes(),
                fc.getCreatedAt(), fc.getUpdatedAt());
    }

    public static FoodCourtResponse toResponse(FoodCourt fc, StallRepository stallRepository,
                                               StallLeaseRepository leaseRepository) {
        long stallCount = stallRepository.countActiveByFoodCourt(fc.getId());
        long occupied = leaseRepository.findByFoodCourtAndStatus(fc.getId(), LeaseStatus.ACTIVE).stream()
                .map(l -> l.getStallId()).distinct().count();
        return toResponse(fc, stallCount, occupied);
    }
}
