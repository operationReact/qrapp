package com.broandbro.qrapp.foodcourt.controller;

import com.broandbro.qrapp.foodcourt.dto.DepositRequest;
import com.broandbro.qrapp.foodcourt.dto.DepositResponse;
import com.broandbro.qrapp.foodcourt.dto.DepositSettlementRequest;
import com.broandbro.qrapp.foodcourt.security.FoodCourtAccessService;
import com.broandbro.qrapp.foodcourt.service.DepositService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Deposit / asset consideration tracking under a food court. */
@RestController
@RequestMapping("/api/v1/food-courts/{foodCourtId}/deposits")
@PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN','MANAGER','FOODCOURT_SUPER_ADMIN','FOODCOURT_ADMIN','FOODCOURT_MANAGER','FOODCOURT_FINANCE','FOODCOURT_VIEWER')")
@Tag(name = "Food Court Deposits", description = "Security deposits and asset considerations")
public class DepositController extends FoodCourtBaseController {

    private final DepositService depositService;

    public DepositController(FoodCourtAccessService accessService, DepositService depositService) {
        super(accessService);
        this.depositService = depositService;
    }

    @PostMapping
    public ResponseEntity<DepositResponse> create(@PathVariable UUID foodCourtId,
                                                 @Valid @RequestBody DepositRequest request, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(depositService.create(foodCourtId, request, actor(auth)));
    }

    @GetMapping
    public ResponseEntity<List<DepositResponse>> list(@PathVariable UUID foodCourtId, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(depositService.list(foodCourtId));
    }

    @GetMapping("/{depositId}")
    public ResponseEntity<DepositResponse> getById(@PathVariable UUID foodCourtId, @PathVariable UUID depositId,
                                                   Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(depositService.getById(foodCourtId, depositId));
    }

    @PostMapping("/{depositId}/settle")
    @Operation(summary = "Settle a deposit (refund / forfeit / adjust)")
    public ResponseEntity<DepositResponse> settle(@PathVariable UUID foodCourtId, @PathVariable UUID depositId,
                                                 @Valid @RequestBody DepositSettlementRequest request,
                                                 Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(depositService.settle(foodCourtId, depositId, request, actor(auth)));
    }
}
