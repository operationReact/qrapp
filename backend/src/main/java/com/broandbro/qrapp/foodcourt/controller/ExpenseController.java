package com.broandbro.qrapp.foodcourt.controller;

import com.broandbro.qrapp.foodcourt.dto.ExpenseRequest;
import com.broandbro.qrapp.foodcourt.dto.ExpenseResponse;
import com.broandbro.qrapp.foodcourt.security.FoodCourtAccessService;
import com.broandbro.qrapp.foodcourt.service.ExpenseService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Operating expense CRUD under a food court. */
@RestController
@RequestMapping("/api/v1/food-courts/{foodCourtId}/expenses")
@PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN','MANAGER','FOODCOURT_SUPER_ADMIN','FOODCOURT_ADMIN','FOODCOURT_MANAGER','FOODCOURT_FINANCE','FOODCOURT_VIEWER')")
@Tag(name = "Food Court Expenses", description = "Operating expenses")
public class ExpenseController extends FoodCourtBaseController {

    private final ExpenseService expenseService;

    public ExpenseController(FoodCourtAccessService accessService, ExpenseService expenseService) {
        super(accessService);
        this.expenseService = expenseService;
    }

    @PostMapping
    public ResponseEntity<ExpenseResponse> create(@PathVariable UUID foodCourtId,
                                                 @Valid @RequestBody ExpenseRequest request, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(expenseService.create(foodCourtId, request, actor(auth)));
    }

    @GetMapping
    public ResponseEntity<List<ExpenseResponse>> list(@PathVariable UUID foodCourtId,
                                                      @RequestParam(required = false)
                                                      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                      @RequestParam(required = false)
                                                      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                                      Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(expenseService.list(foodCourtId, from, to));
    }

    @GetMapping("/{expenseId}")
    public ResponseEntity<ExpenseResponse> getById(@PathVariable UUID foodCourtId, @PathVariable UUID expenseId,
                                                   Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(expenseService.getById(foodCourtId, expenseId));
    }

    @PutMapping("/{expenseId}")
    public ResponseEntity<ExpenseResponse> update(@PathVariable UUID foodCourtId, @PathVariable UUID expenseId,
                                                 @Valid @RequestBody ExpenseRequest request, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(expenseService.update(foodCourtId, expenseId, request, actor(auth)));
    }

    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Void> delete(@PathVariable UUID foodCourtId, @PathVariable UUID expenseId,
                                       Authentication auth) {
        requireAccess(auth, foodCourtId);
        expenseService.delete(foodCourtId, expenseId, actor(auth));
        return ResponseEntity.noContent().build();
    }
}
