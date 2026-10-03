package com.broandbro.qrapp.foodcourt.controller;

import com.broandbro.qrapp.foodcourt.dto.FoodCourtDashboardResponse;
import com.broandbro.qrapp.foodcourt.dto.FoodCourtFinancialReportResponse;
import com.broandbro.qrapp.foodcourt.dto.FoodCourtRequest;
import com.broandbro.qrapp.foodcourt.dto.FoodCourtResponse;
import com.broandbro.qrapp.foodcourt.security.FoodCourtAccessService;
import com.broandbro.qrapp.foodcourt.service.FoodCourtService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Food court CRUD, list/detail, dashboard and financial reports. List results
 * are scoped to the caller's accessible food courts; detail and sub-resource
 * access is enforced per food court.
 */
@RestController
@RequestMapping("/api/v1/food-courts")
@PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN','MANAGER','FOODCOURT_SUPER_ADMIN','FOODCOURT_ADMIN','FOODCOURT_MANAGER','FOODCOURT_VIEWER')")
@Tag(name = "Food Courts", description = "Food court property & rent management")
public class FoodCourtController extends FoodCourtBaseController {

    private final FoodCourtService foodCourtService;

    public FoodCourtController(FoodCourtAccessService accessService, FoodCourtService foodCourtService) {
        super(accessService);
        this.foodCourtService = foodCourtService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN')")
    @Operation(summary = "Create a food court")
    public ResponseEntity<FoodCourtResponse> create(@Valid @RequestBody FoodCourtRequest request,
                                                    Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(foodCourtService.create(request, actor(auth)));
    }

    @GetMapping
    @Operation(summary = "List food courts visible to the caller")
    public ResponseEntity<List<FoodCourtResponse>> list(Authentication auth) {
        return ResponseEntity.ok(foodCourtService.list(accessService.resolveScope(auth)));
    }

    @GetMapping("/{foodCourtId}")
    @Operation(summary = "Get a food court by id")
    public ResponseEntity<FoodCourtResponse> getById(@PathVariable UUID foodCourtId, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(foodCourtService.getById(foodCourtId));
    }

    @PutMapping("/{foodCourtId}")
    @Operation(summary = "Update a food court")
    public ResponseEntity<FoodCourtResponse> update(@PathVariable UUID foodCourtId,
                                                    @Valid @RequestBody FoodCourtRequest request,
                                                    Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(foodCourtService.update(foodCourtId, request, actor(auth)));
    }

    @DeleteMapping("/{foodCourtId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN')")
    @Operation(summary = "Archive (soft-delete) a food court")
    public ResponseEntity<Void> delete(@PathVariable UUID foodCourtId, Authentication auth) {
        requireAccess(auth, foodCourtId);
        foodCourtService.delete(foodCourtId, actor(auth));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{foodCourtId}/dashboard")
    @Operation(summary = "Operational & financial dashboard snapshot")
    public ResponseEntity<FoodCourtDashboardResponse> dashboard(@PathVariable UUID foodCourtId,
                                                                 @RequestParam(required = false) Integer year,
                                                                 @RequestParam(required = false) Integer month,
                                                                 Authentication auth) {
        requireAccess(auth, foodCourtId);
        if (year == null || month == null) {
            return ResponseEntity.ok(foodCourtService.dashboard(foodCourtId));
        }
        return ResponseEntity.ok(foodCourtService.dashboard(foodCourtId, year, month));
    }

    @GetMapping("/{foodCourtId}/reports/financial")
    @Operation(summary = "Monthly financial report")
    public ResponseEntity<FoodCourtFinancialReportResponse> financialReport(@PathVariable UUID foodCourtId,
                                                                            @RequestParam int year,
                                                                            @RequestParam int month,
                                                                            Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(foodCourtService.financialReport(foodCourtId, year, month));
    }
}
