package com.broandbro.qrapp.foodcourt.service;

import com.broandbro.qrapp.foodcourt.dto.LandlordRequest;
import com.broandbro.qrapp.foodcourt.dto.LandlordResponse;
import com.broandbro.qrapp.foodcourt.dto.PropertyLeaseRequest;
import com.broandbro.qrapp.foodcourt.dto.PropertyLeaseResponse;
import com.broandbro.qrapp.foodcourt.entity.Landlord;
import com.broandbro.qrapp.foodcourt.entity.PropertyLease;
import com.broandbro.qrapp.foodcourt.enums.AuditAction;
import com.broandbro.qrapp.foodcourt.enums.LeaseStatus;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtNotFoundException;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtValidationException;
import com.broandbro.qrapp.foodcourt.audit.FoodCourtAuditService;
import com.broandbro.qrapp.foodcourt.repository.FoodCourtRepository;
import com.broandbro.qrapp.foodcourt.repository.LandlordRepository;
import com.broandbro.qrapp.foodcourt.repository.PropertyLeaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Landlord and property (head) lease management. Property lease dates and
 * payment methods are nullable to accommodate historical agreements with
 * unknown terms.
 */
@Service
@RequiredArgsConstructor
public class LandlordService {

    private final LandlordRepository landlordRepository;
    private final PropertyLeaseRepository propertyLeaseRepository;
    private final FoodCourtRepository foodCourtRepository;
    private final FoodCourtAuditService auditService;

    // ── Landlords ──────────────────────────────────────────────────────────

    @Transactional
    public LandlordResponse createLandlord(UUID foodCourtId, LandlordRequest req, String actorUserId) {
        requireFoodCourt(foodCourtId);
        Landlord landlord = Landlord.builder()
                .foodCourtId(foodCourtId)
                .name(req.name().trim())
                .contactPhone(req.contactPhone())
                .contactEmail(req.contactEmail())
                .addressLine(req.addressLine())
                .notes(req.notes())
                .createdBy(actorUserId)
                .updatedBy(actorUserId)
                .build();
        landlord = landlordRepository.save(landlord);
        auditService.record(foodCourtId, AuditAction.CREATE, "LANDLORD", landlord.getId(), actorUserId,
                "Created landlord " + landlord.getName());
        return toResponse(landlord);
    }

    @Transactional
    public LandlordResponse updateLandlord(UUID foodCourtId, UUID landlordId, LandlordRequest req, String actorUserId) {
        Landlord landlord = requireLandlord(foodCourtId, landlordId);
        landlord.setName(req.name().trim());
        landlord.setContactPhone(req.contactPhone());
        landlord.setContactEmail(req.contactEmail());
        landlord.setAddressLine(req.addressLine());
        landlord.setNotes(req.notes());
        landlord.setUpdatedBy(actorUserId);
        landlord = landlordRepository.save(landlord);
        auditService.record(foodCourtId, AuditAction.UPDATE, "LANDLORD", landlord.getId(), actorUserId,
                "Updated landlord " + landlord.getName());
        return toResponse(landlord);
    }

    @Transactional
    public void deleteLandlord(UUID foodCourtId, UUID landlordId, String actorUserId) {
        Landlord landlord = requireLandlord(foodCourtId, landlordId);
        landlord.setDeletedAt(Instant.now());
        landlord.setUpdatedBy(actorUserId);
        landlordRepository.save(landlord);
        auditService.record(foodCourtId, AuditAction.DELETE, "LANDLORD", landlord.getId(), actorUserId,
                "Deleted landlord " + landlord.getName());
    }

    @Transactional(readOnly = true)
    public List<LandlordResponse> listLandlords(UUID foodCourtId) {
        requireFoodCourt(foodCourtId);
        return landlordRepository.findActiveByFoodCourt(foodCourtId).stream().map(this::toResponse).toList();
    }

    // ── Property leases ──────────────────────────────────────────────────────

    @Transactional
    public PropertyLeaseResponse createPropertyLease(UUID foodCourtId, PropertyLeaseRequest req, String actorUserId) {
        requireFoodCourt(foodCourtId);
        requireLandlord(foodCourtId, req.landlordId());
        validateDates(req.startDate(), req.endDate());
        PropertyLease lease = PropertyLease.builder()
                .foodCourtId(foodCourtId)
                .landlordId(req.landlordId())
                .startDate(req.startDate())
                .endDate(req.endDate())
                .monthlyRent(req.monthlyRent())
                .depositAmount(req.depositAmount())
                .rentDueDay(req.rentDueDay())
                .paymentMethod(req.paymentMethod())
                .status(req.status() == null ? LeaseStatus.ACTIVE : req.status())
                .notes(req.notes())
                .createdBy(actorUserId)
                .updatedBy(actorUserId)
                .build();
        lease = propertyLeaseRepository.save(lease);
        auditService.record(foodCourtId, AuditAction.CREATE, "PROPERTY_LEASE", lease.getId(), actorUserId,
                "Created property lease");
        return toResponse(lease);
    }

    @Transactional
    public PropertyLeaseResponse updatePropertyLease(UUID foodCourtId, UUID leaseId, PropertyLeaseRequest req,
                                                     String actorUserId) {
        PropertyLease lease = propertyLeaseRepository.findByIdAndFoodCourtId(leaseId, foodCourtId)
                .orElseThrow(() -> new FoodCourtNotFoundException("property_lease_not_found: " + leaseId));
        requireLandlord(foodCourtId, req.landlordId());
        validateDates(req.startDate(), req.endDate());
        lease.setLandlordId(req.landlordId());
        lease.setStartDate(req.startDate());
        lease.setEndDate(req.endDate());
        lease.setMonthlyRent(req.monthlyRent());
        lease.setDepositAmount(req.depositAmount());
        lease.setRentDueDay(req.rentDueDay());
        lease.setPaymentMethod(req.paymentMethod());
        if (req.status() != null) {
            lease.setStatus(req.status());
        }
        lease.setNotes(req.notes());
        lease.setUpdatedBy(actorUserId);
        lease = propertyLeaseRepository.save(lease);
        auditService.record(foodCourtId, AuditAction.UPDATE, "PROPERTY_LEASE", lease.getId(), actorUserId,
                "Updated property lease");
        return toResponse(lease);
    }

    @Transactional(readOnly = true)
    public List<PropertyLeaseResponse> listPropertyLeases(UUID foodCourtId) {
        requireFoodCourt(foodCourtId);
        return propertyLeaseRepository.findByFoodCourt(foodCourtId).stream().map(this::toResponse).toList();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    LandlordResponse toResponse(Landlord l) {
        return new LandlordResponse(l.getId(), l.getFoodCourtId(), l.getName(),
                l.getContactPhone(), l.getContactEmail(), l.getAddressLine(), l.getNotes());
    }

    PropertyLeaseResponse toResponse(PropertyLease l) {
        String landlordName = landlordRepository.findActiveById(l.getLandlordId())
                .map(Landlord::getName).orElse(null);
        return new PropertyLeaseResponse(
                l.getId(), l.getFoodCourtId(), l.getLandlordId(), landlordName,
                l.getStartDate(), l.getEndDate(), l.getMonthlyRent(), l.getDepositAmount(),
                l.getRentDueDay(), l.getPaymentMethod(), l.getStatus(), l.getNotes());
    }

    private void validateDates(java.time.LocalDate start, java.time.LocalDate end) {
        if (start != null && end != null && end.isBefore(start)) {
            throw new FoodCourtValidationException("end_date_must_not_be_before_start_date");
        }
    }

    private void requireFoodCourt(UUID foodCourtId) {
        if (foodCourtRepository.findActiveById(foodCourtId).isEmpty()) {
            throw new FoodCourtNotFoundException("food_court_not_found: " + foodCourtId);
        }
    }

    private Landlord requireLandlord(UUID foodCourtId, UUID landlordId) {
        Landlord landlord = landlordRepository.findActiveById(landlordId)
                .orElseThrow(() -> new FoodCourtNotFoundException("landlord_not_found: " + landlordId));
        if (!landlord.getFoodCourtId().equals(foodCourtId)) {
            throw new FoodCourtNotFoundException("landlord_not_found_in_food_court: " + landlordId);
        }
        return landlord;
    }
}
