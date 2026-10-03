package com.broandbro.qrapp.foodcourt.controller;

import com.broandbro.qrapp.foodcourt.dto.FoodCourtAccessRequest;
import com.broandbro.qrapp.foodcourt.dto.FoodCourtAccessResponse;
import com.broandbro.qrapp.foodcourt.dto.FoodCourtAuditEventResponse;
import com.broandbro.qrapp.foodcourt.security.FoodCourtAccessService;
import com.broandbro.qrapp.foodcourt.service.FoodCourtAccessAdminService;
import io.swagger.v3.oas.annotations.Operation;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Per-food-court access grants (keyed by opaque user id) and the audit trail.
 * Managing grants requires an elevated platform role; the caller must also have
 * access to the food court.
 */
@RestController
@RequestMapping("/api/v1/food-courts/{foodCourtId}")
@PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN','MANAGER','FOODCOURT_SUPER_ADMIN','FOODCOURT_ADMIN')")
@Tag(name = "Food Court Access & Audit", description = "Per-food-court access grants and audit trail")
public class FoodCourtAccessController extends FoodCourtBaseController {

    private final FoodCourtAccessAdminService accessAdminService;

    public FoodCourtAccessController(FoodCourtAccessService accessService,
                                     FoodCourtAccessAdminService accessAdminService) {
        super(accessService);
        this.accessAdminService = accessAdminService;
    }

    @PostMapping("/access")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN')")
    @Operation(summary = "Grant or update a user's access to the food court")
    public ResponseEntity<FoodCourtAccessResponse> grant(@PathVariable UUID foodCourtId,
                                                         @Valid @RequestBody FoodCourtAccessRequest request,
                                                         Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(accessAdminService.grant(foodCourtId, request, actor(auth)));
    }

    @GetMapping("/access")
    @Operation(summary = "List active access grants for the food court")
    public ResponseEntity<List<FoodCourtAccessResponse>> list(@PathVariable UUID foodCourtId, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(accessAdminService.list(foodCourtId));
    }

    @DeleteMapping("/access/{accessId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN')")
    @Operation(summary = "Revoke an access grant")
    public ResponseEntity<Void> revoke(@PathVariable UUID foodCourtId, @PathVariable UUID accessId,
                                       Authentication auth) {
        requireAccess(auth, foodCourtId);
        accessAdminService.revoke(foodCourtId, accessId, actor(auth));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/audit")
    @Operation(summary = "Read the food court audit trail")
    public ResponseEntity<List<FoodCourtAuditEventResponse>> audit(@PathVariable UUID foodCourtId,
                                                                   @RequestParam(defaultValue = "0") int page,
                                                                   @RequestParam(defaultValue = "50") int size,
                                                                   Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(accessAdminService.auditTrail(foodCourtId, page, Math.min(size, 200)));
    }
}
