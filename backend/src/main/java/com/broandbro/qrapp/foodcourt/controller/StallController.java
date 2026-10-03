package com.broandbro.qrapp.foodcourt.controller;

import com.broandbro.qrapp.foodcourt.dto.StallRequest;
import com.broandbro.qrapp.foodcourt.dto.StallResponse;
import com.broandbro.qrapp.foodcourt.security.FoodCourtAccessService;
import com.broandbro.qrapp.foodcourt.service.StallService;
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

/** Stall CRUD under a food court. Occupancy is derived from active leases. */
@RestController
@RequestMapping("/api/v1/food-courts/{foodCourtId}/stalls")
@PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN','MANAGER','FOODCOURT_SUPER_ADMIN','FOODCOURT_ADMIN','FOODCOURT_MANAGER','FOODCOURT_OPERATIONS','FOODCOURT_VIEWER')")
@Tag(name = "Food Court Stalls", description = "Rentable stalls within a food court")
public class StallController extends FoodCourtBaseController {

    private final StallService stallService;

    public StallController(FoodCourtAccessService accessService, StallService stallService) {
        super(accessService);
        this.stallService = stallService;
    }

    @PostMapping
    public ResponseEntity<StallResponse> create(@PathVariable UUID foodCourtId,
                                                @Valid @RequestBody StallRequest request,
                                                Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(stallService.create(foodCourtId, request, actor(auth)));
    }

    @GetMapping
    public ResponseEntity<List<StallResponse>> list(@PathVariable UUID foodCourtId, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(stallService.list(foodCourtId));
    }

    @GetMapping("/{stallId}")
    public ResponseEntity<StallResponse> getById(@PathVariable UUID foodCourtId, @PathVariable UUID stallId,
                                                 Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(stallService.getById(foodCourtId, stallId));
    }

    @PutMapping("/{stallId}")
    public ResponseEntity<StallResponse> update(@PathVariable UUID foodCourtId, @PathVariable UUID stallId,
                                                @Valid @RequestBody StallRequest request, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(stallService.update(foodCourtId, stallId, request, actor(auth)));
    }

    @DeleteMapping("/{stallId}")
    public ResponseEntity<Void> delete(@PathVariable UUID foodCourtId, @PathVariable UUID stallId,
                                       Authentication auth) {
        requireAccess(auth, foodCourtId);
        stallService.delete(foodCourtId, stallId, actor(auth));
        return ResponseEntity.noContent().build();
    }
}
