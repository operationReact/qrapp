package com.broandbro.qrapp.service;
import com.broandbro.qrapp.dto.VendorRequest;
import com.broandbro.qrapp.dto.VendorResponse;
import com.broandbro.qrapp.entity.Vendor;
import com.broandbro.qrapp.exception.DuplicatePhoneException;
import com.broandbro.qrapp.repository.VendorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
@Service
@Transactional
public class VendorService {
    private static final Logger log = LoggerFactory.getLogger(VendorService.class);
    private final VendorRepository vendorRepository;
    public VendorService(VendorRepository vendorRepository) {
        this.vendorRepository = vendorRepository;
    }
    public VendorResponse createVendor(VendorRequest request) {
        // Validate duplicate phone
        vendorRepository.findByPhoneNumber(request.getPhoneNumber())
            .ifPresent(s -> {
                throw new DuplicatePhoneException("Phone number already registered: " + request.getPhoneNumber());
            });
        Vendor vendor = new Vendor();
        vendor.setVendorName(request.getVendorName());
        vendor.setPhoneNumber(request.getPhoneNumber());
        vendor.setAlternatePhoneNumber(request.getAlternatePhoneNumber());
        vendor.setAddress(request.getAddress());
        vendor.setIsActive(true);
        Vendor savedVendor = vendorRepository.save(vendor);
        log.info("Vendor created with id: {} and phone: {}", savedVendor.getId(), savedVendor.getPhoneNumber());
        // TODO: Publish VendorCreatedEvent for async WhatsApp onboarding
        // publishEvent(new VendorCreatedEvent(savedVendor));
        return mapToResponse(savedVendor);
    }
    public VendorResponse getVendor(Long vendorId) {
        Vendor vendor = vendorRepository.findById(vendorId)
            .orElseThrow(() -> new RuntimeException("Vendor not found: " + vendorId));
        return mapToResponse(vendor);
    }
    private VendorResponse mapToResponse(Vendor vendor) {
        VendorResponse response = new VendorResponse();
        response.setId(vendor.getId());
        response.setVendorName(vendor.getVendorName());
        response.setPhoneNumber(vendor.getPhoneNumber());
        response.setAlternatePhoneNumber(vendor.getAlternatePhoneNumber());
        response.setAddress(vendor.getAddress());
        response.setIsActive(vendor.getIsActive());
        response.setCreatedAt(vendor.getCreatedAt());
        response.setUpdatedAt(vendor.getUpdatedAt());
        return response;
    }
}
