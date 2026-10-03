package com.broandbro.qrapp.foodcourt.controller;

import com.broandbro.qrapp.foodcourt.dto.LandlordRequest;
import com.broandbro.qrapp.foodcourt.dto.LandlordResponse;
import com.broandbro.qrapp.foodcourt.dto.PropertyLeaseRequest;
import com.broandbro.qrapp.foodcourt.dto.PropertyLeaseResponse;
import com.broandbro.qrapp.foodcourt.security.FoodCourtAccessService;
import com.broandbro.qrapp.foodcourt.service.LandlordService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Landlords and the property (head) lease under a food court. */
@RestController
@RequestMapping("/api/v1/food-courts/{foodCourtId}")
@PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN','MANAGER','FOODCOURT_SUPER_ADMIN','FOODCOURT_ADMIN','FOODCOURT_MANAGER','FOODCOURT_FINANCE','FOODCOURT_VIEWER')")
@Tag(name = "Food Court Landlords", description = "Landlords and property (head) leases")
public class LandlordController extends FoodCourtBaseController {

    private final LandlordService landlordService;

    public LandlordController(FoodCourtAccessService accessService, LandlordService landlordService) {
        super(accessService);
        this.landlordService = landlordService;
    }

    // ── Landlords ──────────────────────────────────────────────────────────

    @PostMapping("/landlords")
    public ResponseEntity<LandlordResponse> createLandlord(@PathVariable UUID foodCourtId,
                                                           @Valid @RequestBody LandlordRequest request,
                                                           Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(landlordService.createLandlord(foodCourtId, request, actor(auth)));
    }

    @GetMapping("/landlords")
    public ResponseEntity<List<LandlordResponse>> listLandlords(@PathVariable UUID foodCourtId, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(landlordService.listLandlords(foodCourtId));
    }

    @PutMapping("/landlords/{landlordId}")
    public ResponseEntity<LandlordResponse> updateLandlord(@PathVariable UUID foodCourtId,
                                                           @PathVariable UUID landlordId,
                                                           @Valid @RequestBody LandlordRequest request,
                                                           Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(landlordService.updateLandlord(foodCourtId, landlordId, request, actor(auth)));
    }

    @DeleteMapping("/landlords/{landlordId}")
    public ResponseEntity<Void> deleteLandlord(@PathVariable UUID foodCourtId, @PathVariable UUID landlordId,
                                               Authentication auth) {
        requireAccess(auth, foodCourtId);
        landlordService.deleteLandlord(foodCourtId, landlordId, actor(auth));
        return ResponseEntity.noContent().build();
    }

    // ── Property leases ──────────────────────────────────────────────────────

    @PostMapping("/property-leases")
    public ResponseEntity<PropertyLeaseResponse> createPropertyLease(@PathVariable UUID foodCourtId,
                                                                     @Valid @RequestBody PropertyLeaseRequest request,
                                                                     Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(landlordService.createPropertyLease(foodCourtId, request, actor(auth)));
    }

    @GetMapping("/property-leases")
    public ResponseEntity<List<PropertyLeaseResponse>> listPropertyLeases(@PathVariable UUID foodCourtId,
                                                                          Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(landlordService.listPropertyLeases(foodCourtId));
    }

    @PutMapping("/property-leases/{leaseId}")
    public ResponseEntity<PropertyLeaseResponse> updatePropertyLease(@PathVariable UUID foodCourtId,
                                                                     @PathVariable UUID leaseId,
                                                                     @Valid @RequestBody PropertyLeaseRequest request,
                                                                     Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(landlordService.updatePropertyLease(foodCourtId, leaseId, request, actor(auth)));
    }
}
