package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.LocationResponse;
import com.broandbro.qrapp.dto.VendorBillActionRequest;
import com.broandbro.qrapp.dto.VendorBillRequest;
import com.broandbro.qrapp.dto.VendorBillResponse;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.service.VendorBillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Vendor (external supplier) portal: create, edit, submit bills and comment, scoped to the vendor's location. */
@RestController
@RequestMapping("/api/vendor/bills")
@RequiredArgsConstructor
public class VendorBillController {
    private final VendorBillService vendorBillService;
    private final UserService userService;

    @GetMapping("/locations")
    public List<LocationResponse> locations(Authentication authentication) {
        return vendorBillService.vendorLocations(requireUser(authentication));
    }

    @GetMapping
    public List<VendorBillResponse> list(@RequestParam Long locationId, Authentication authentication) {
        return vendorBillService.listForVendor(requireUser(authentication), locationId);
    }

    @GetMapping("/{billId}")
    public VendorBillResponse get(@PathVariable Long billId, @RequestParam Long locationId,
                                  Authentication authentication) {
        return vendorBillService.getForVendor(requireUser(authentication), locationId, billId);
    }

    @PostMapping
    public ResponseEntity<VendorBillResponse> create(@RequestParam Long locationId,
                                                     @RequestParam(defaultValue = "false") boolean submit,
                                                     @RequestBody VendorBillRequest request,
                                                     Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                vendorBillService.createForVendor(requireUser(authentication), locationId, request, submit));
    }

    @PutMapping("/{billId}")
    public VendorBillResponse update(@PathVariable Long billId, @RequestParam Long locationId,
                                     @RequestParam(defaultValue = "false") boolean submit,
                                     @RequestBody VendorBillRequest request,
                                     Authentication authentication) {
        return vendorBillService.updateForVendor(requireUser(authentication), locationId, billId, request, submit);
    }

    @PostMapping("/{billId}/comments")
    public VendorBillResponse comment(@PathVariable Long billId, @RequestParam Long locationId,
                                      @RequestBody VendorBillActionRequest request,
                                      Authentication authentication) {
        return vendorBillService.addComment(requireUser(authentication), locationId, billId,
                request == null ? null : request.message());
    }

    private User requireUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AccessDeniedException("authentication_required");
        }
        return userService.findByPhone(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("authentication_required"));
    }
}
