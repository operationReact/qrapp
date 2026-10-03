package com.broandbro.qrapp.foodcourt.controller;

import com.broandbro.qrapp.foodcourt.dto.LandlordRentObligationResponse;
import com.broandbro.qrapp.foodcourt.security.FoodCourtAccessService;
import com.broandbro.qrapp.foodcourt.service.LandlordRentService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/food-courts/{foodCourtId}/landlord-rent")
public class LandlordRentController extends FoodCourtBaseController {
    private final LandlordRentService landlordRentService;

    public LandlordRentController(FoodCourtAccessService accessService, LandlordRentService landlordRentService) {
        super(accessService);
        this.landlordRentService = landlordRentService;
    }

    @PostMapping("/generate")
    public ResponseEntity<List<LandlordRentObligationResponse>> generate(
            @PathVariable UUID foodCourtId,
            @RequestParam @Min(2000) int year,
            @RequestParam @Min(1) @Max(12) int month,
            Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(landlordRentService.generate(foodCourtId, year, month, actor(auth)));
    }

    @GetMapping
    public ResponseEntity<List<LandlordRentObligationResponse>> list(
            @PathVariable UUID foodCourtId, Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(landlordRentService.list(foodCourtId));
    }
}
