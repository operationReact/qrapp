package com.broandbro.qrapp.foodcourt.controller;

import com.broandbro.qrapp.foodcourt.dto.StallLeaseRequest;
import com.broandbro.qrapp.foodcourt.dto.StallLeaseResponse;
import com.broandbro.qrapp.foodcourt.security.FoodCourtAccessService;
import com.broandbro.qrapp.foodcourt.service.StallLeaseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Stall lease lifecycle under a food court. Overlapping active leases on the
 * same stall are rejected (409).
 */
@RestController
@RequestMapping("/api/v1/food-courts/{foodCourtId}/stall-leases")
@PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN','MANAGER','FOODCOURT_SUPER_ADMIN','FOODCOURT_ADMIN','FOODCOURT_MANAGER','FOODCOURT_OPERATIONS','FOODCOURT_VIEWER')")
@Tag(name = "Food Court Stall Leases", description = "Stall sub-leases to tenants")
public class StallLeaseController extends FoodCourtBaseController {

    private final StallLeaseService leaseService;

    public StallLeaseController(FoodCourtAccessService accessService, StallLeaseService leaseService) {
        super(accessService);
        this.leaseService = leaseService;
    }

    @PostMapping
    public ResponseEntity<StallLeaseResponse> create(@PathVariable UUID foodCourtId,
                                                     @Valid @RequestBody StallLeaseRequest request,
                                                     Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(leaseService.create(foodCourtId, request, actor(auth)));
    }

    @GetMapping
    public ResponseEntity<List<StallLeaseResponse>> list(@PathVariable UUID foodCourtId, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(leaseService.list(foodCourtId));
    }

    @GetMapping("/{leaseId}")
    public ResponseEntity<StallLeaseResponse> getById(@PathVariable UUID foodCourtId, @PathVariable UUID leaseId,
                                                      Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(leaseService.getById(foodCourtId, leaseId));
    }

    @PutMapping("/{leaseId}")
    public ResponseEntity<StallLeaseResponse> update(@PathVariable UUID foodCourtId, @PathVariable UUID leaseId,
                                                     @Valid @RequestBody StallLeaseRequest request,
                                                     Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(leaseService.update(foodCourtId, leaseId, request, actor(auth)));
    }

    @PostMapping("/{leaseId}/terminate")
    @Operation(summary = "Terminate a stall lease, freeing the stall")
    public ResponseEntity<StallLeaseResponse> terminate(@PathVariable UUID foodCourtId, @PathVariable UUID leaseId,
                                                        @RequestParam(required = false)
                                                        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(leaseService.terminate(foodCourtId, leaseId, endDate, actor(auth)));
    }
}
