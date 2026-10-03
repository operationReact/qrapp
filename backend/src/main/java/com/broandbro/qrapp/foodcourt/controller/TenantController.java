package com.broandbro.qrapp.foodcourt.controller;

import com.broandbro.qrapp.foodcourt.dto.TenantRequest;
import com.broandbro.qrapp.foodcourt.dto.TenantResponse;
import com.broandbro.qrapp.foodcourt.security.FoodCourtAccessService;
import com.broandbro.qrapp.foodcourt.service.TenantService;
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

/** Tenant CRUD under a food court. */
@RestController
@RequestMapping("/api/v1/food-courts/{foodCourtId}/tenants")
@PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN','MANAGER','FOODCOURT_SUPER_ADMIN','FOODCOURT_ADMIN','FOODCOURT_MANAGER','FOODCOURT_OPERATIONS','FOODCOURT_VIEWER')")
@Tag(name = "Food Court Tenants", description = "Tenants occupying stalls")
public class TenantController extends FoodCourtBaseController {

    private final TenantService tenantService;

    public TenantController(FoodCourtAccessService accessService, TenantService tenantService) {
        super(accessService);
        this.tenantService = tenantService;
    }

    @PostMapping
    public ResponseEntity<TenantResponse> create(@PathVariable UUID foodCourtId,
                                                 @Valid @RequestBody TenantRequest request, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(tenantService.create(foodCourtId, request, actor(auth)));
    }

    @GetMapping
    public ResponseEntity<List<TenantResponse>> list(@PathVariable UUID foodCourtId, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(tenantService.list(foodCourtId));
    }

    @GetMapping("/{tenantId}")
    public ResponseEntity<TenantResponse> getById(@PathVariable UUID foodCourtId, @PathVariable UUID tenantId,
                                                  Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(tenantService.getById(foodCourtId, tenantId));
    }

    @PutMapping("/{tenantId}")
    public ResponseEntity<TenantResponse> update(@PathVariable UUID foodCourtId, @PathVariable UUID tenantId,
                                                 @Valid @RequestBody TenantRequest request, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(tenantService.update(foodCourtId, tenantId, request, actor(auth)));
    }

    @DeleteMapping("/{tenantId}")
    public ResponseEntity<Void> delete(@PathVariable UUID foodCourtId, @PathVariable UUID tenantId,
                                       Authentication auth) {
        requireAccess(auth, foodCourtId);
        tenantService.delete(foodCourtId, tenantId, actor(auth));
        return ResponseEntity.noContent().build();
    }
}
