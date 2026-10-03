package com.broandbro.qrapp.foodcourt.controller;

import com.broandbro.qrapp.foodcourt.dto.RentAdjustmentRequest;
import com.broandbro.qrapp.foodcourt.dto.RentAdjustmentResponse;
import com.broandbro.qrapp.foodcourt.dto.RentGenerationRequest;
import com.broandbro.qrapp.foodcourt.dto.RentGenerationResultResponse;
import com.broandbro.qrapp.foodcourt.dto.RentInvoiceResponse;
import com.broandbro.qrapp.foodcourt.dto.RentPaymentRequest;
import com.broandbro.qrapp.foodcourt.dto.RentPaymentResponse;
import com.broandbro.qrapp.foodcourt.security.FoodCourtAccessService;
import com.broandbro.qrapp.foodcourt.service.RentService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Rent generation and settlement under a food court: generate monthly invoices,
 * record payments and apply adjustments. Generation never duplicates an existing
 * (lease, month); payments and adjustments are append-only financial records.
 */
@RestController
@RequestMapping("/api/v1/food-courts/{foodCourtId}/rent")
@PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN','MANAGER','FOODCOURT_SUPER_ADMIN','FOODCOURT_ADMIN','FOODCOURT_MANAGER','FOODCOURT_FINANCE','FOODCOURT_VIEWER')")
@Tag(name = "Food Court Rent", description = "Rent generation, payments and adjustments")
public class RentController extends FoodCourtBaseController {

    private final RentService rentService;

    public RentController(FoodCourtAccessService accessService, RentService rentService) {
        super(accessService);
        this.rentService = rentService;
    }

    @PostMapping("/generate")
    @Operation(summary = "Generate monthly rent invoices for active leases")
    public ResponseEntity<RentGenerationResultResponse> generate(@PathVariable UUID foodCourtId,
                                                                 @Valid @RequestBody RentGenerationRequest request,
                                                                 Authentication auth) {
        requireAccess(auth, foodCourtId);
        RentGenerationResultResponse result = rentService.generate(
                foodCourtId, request.year(), request.month(), request.stallLeaseIds(), actor(auth));
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/invoices")
    @Operation(summary = "List rent invoices, optionally filtered by period")
    public ResponseEntity<List<RentInvoiceResponse>> listInvoices(@PathVariable UUID foodCourtId,
                                                                  @RequestParam(required = false) Integer year,
                                                                  @RequestParam(required = false) Integer month,
                                                                  Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(rentService.listInvoices(foodCourtId, year, month));
    }

    @GetMapping("/invoices/{invoiceId}")
    public ResponseEntity<RentInvoiceResponse> getInvoice(@PathVariable UUID foodCourtId,
                                                          @PathVariable UUID invoiceId, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(rentService.getInvoice(foodCourtId, invoiceId));
    }

    @PostMapping("/invoices/{invoiceId}/payments")
    @Operation(summary = "Record a rent payment against an invoice")
    public ResponseEntity<RentPaymentResponse> recordPayment(@PathVariable UUID foodCourtId,
                                                             @PathVariable UUID invoiceId,
                                                             @Valid @RequestBody RentPaymentRequest request,
                                                             Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(rentService.recordPayment(foodCourtId, invoiceId, request, actor(auth)));
    }

    @GetMapping("/invoices/{invoiceId}/payments")
    public ResponseEntity<List<RentPaymentResponse>> listPayments(@PathVariable UUID foodCourtId,
                                                                  @PathVariable UUID invoiceId, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(rentService.listPayments(foodCourtId, invoiceId));
    }

    @PostMapping("/invoices/{invoiceId}/adjustments")
    @Operation(summary = "Apply a signed adjustment to an invoice")
    public ResponseEntity<RentAdjustmentResponse> applyAdjustment(@PathVariable UUID foodCourtId,
                                                                  @PathVariable UUID invoiceId,
                                                                  @Valid @RequestBody RentAdjustmentRequest request,
                                                                  Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(rentService.applyAdjustment(foodCourtId, invoiceId, request, actor(auth)));
    }

    @GetMapping("/invoices/{invoiceId}/adjustments")
    public ResponseEntity<List<RentAdjustmentResponse>> listAdjustments(@PathVariable UUID foodCourtId,
                                                                        @PathVariable UUID invoiceId,
                                                                        Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(rentService.listAdjustments(foodCourtId, invoiceId));
    }
}
