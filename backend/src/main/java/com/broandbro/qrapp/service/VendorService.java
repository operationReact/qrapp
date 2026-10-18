package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.VendorLookupResponse;
import com.broandbro.qrapp.dto.VendorRequest;
import com.broandbro.qrapp.dto.VendorResponse;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.UserLocationAccess;
import com.broandbro.qrapp.entity.UserRole;
import com.broandbro.qrapp.entity.Vendor;
import com.broandbro.qrapp.entity.VendorLocation;
import com.broandbro.qrapp.exception.DuplicatePhoneException;
import com.broandbro.qrapp.otp.PhoneNumberNormalizer;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.UserLocationAccessRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.repository.VendorLocationRepository;
import com.broandbro.qrapp.repository.VendorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;

/**
 * Suppliers are one global identity per phone number and are linked to one or more locations.
 * Edits to the supplier's details are shared; activation is per location.
 */
@Service
@Transactional
public class VendorService {

    private static final Set<UserRole> NON_STAFF_ROLES = Set.of(UserRole.CUSTOMER, UserRole.VENDOR);

    private final VendorRepository vendorRepository;
    private final VendorLocationRepository vendorLocationRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final UserLocationAccessRepository accessRepository;

    public VendorService(VendorRepository vendorRepository,
                         VendorLocationRepository vendorLocationRepository,
                         LocationRepository locationRepository,
                         UserRepository userRepository,
                         UserLocationAccessRepository accessRepository) {
        this.vendorRepository = vendorRepository;
        this.vendorLocationRepository = vendorLocationRepository;
        this.locationRepository = locationRepository;
        this.userRepository = userRepository;
        this.accessRepository = accessRepository;
    }

    /**
     * Creates a supplier for this location. If the phone already belongs to a supplier
     * (from any location), that supplier is linked to this location instead of duplicated.
     */
    public VendorResponse createVendor(VendorRequest request, Long locationId) {
        String phone = normalizePhone(request.getPhoneNumber());
        Vendor vendor = vendorRepository.findByPhoneNumber(phone).orElse(null);
        if (vendor == null) {
            vendor = new Vendor();
            vendor.setVendorName(request.getVendorName());
            vendor.setPhoneNumber(phone);
            vendor.setAlternatePhoneNumber(request.getAlternatePhoneNumber());
            vendor.setAddress(request.getAddress());
            vendor = vendorRepository.save(vendor);
        } else if (vendorLocationRepository.findByVendorIdAndLocationId(vendor.getId(), locationId).isPresent()) {
            throw new IllegalStateException("vendor_already_linked");
        }
        Location location = locationRepository.findById(locationId)
                .orElseThrow(() -> new NoSuchElementException("location_not_found"));
        VendorLocation link = vendorLocationRepository.save(VendorLocation.builder()
                .vendor(vendor).location(location).isActive(true).build());
        return mapToResponse(vendor, link);
    }

    /** Describes what already exists for a phone number so the admin can decide to reuse it. */
    @Transactional(readOnly = true)
    public VendorLookupResponse lookup(String rawPhone, Long locationId) {
        String phone = normalizePhone(rawPhone);
        VendorLookupResponse.VendorLookupResponseBuilder result = VendorLookupResponse.builder().phoneNumber(phone);
        vendorRepository.findByPhoneNumber(phone).ifPresent(vendor -> result
                .supplierExists(true)
                .supplierId(vendor.getId())
                .supplierName(vendor.getVendorName())
                .supplierLinkedHere(vendorLocationRepository.findByVendorIdAndLocationId(vendor.getId(), locationId).isPresent()));
        userRepository.findByPhone(phone).ifPresent(user -> {
            List<UserLocationAccess> accesses = accessRepository.findByUserIdOrderByLocationNameAsc(user.getId());
            result.loginExists(true)
                    .loginName(user.getName())
                    .loginHasVendorAccessHere(accesses.stream().anyMatch(a ->
                            a.getRole() == UserRole.VENDOR && locationId.equals(a.getLocation().getId())))
                    .loginBlocked(isStaffAccount(user, accesses));
        });
        return result.build();
    }

    /** True when the account holds any role other than customer or vendor, so it must not become a vendor login. */
    @Transactional(readOnly = true)
    public boolean isStaffAccount(User user) {
        return isStaffAccount(user, accessRepository.findByUserIdOrderByLocationNameAsc(user.getId()));
    }

    private boolean isStaffAccount(User user, List<UserLocationAccess> accesses) {
        if (!NON_STAFF_ROLES.contains(user.getRole())) return true;
        return accesses.stream().anyMatch(a -> !NON_STAFF_ROLES.contains(a.getRole()));
    }

    @Transactional(readOnly = true)
    public List<VendorResponse> listVendors(Long locationId) {
        return vendorLocationRepository.findByLocationIdOrderByVendorVendorNameAsc(locationId).stream()
                .map(link -> mapToResponse(link.getVendor(), link))
                .toList();
    }

    public VendorResponse updateVendor(Long vendorId, VendorRequest request, Long locationId) {
        VendorLocation link = findOwnedLink(vendorId, locationId);
        Vendor vendor = link.getVendor();
        if (request.getPhoneNumber() != null) {
            String phone = normalizePhone(request.getPhoneNumber());
            if (!phone.equals(vendor.getPhoneNumber())) {
                vendorRepository.findByPhoneNumber(phone).ifPresent(existing -> {
                    if (!existing.getId().equals(vendorId)) {
                        throw new DuplicatePhoneException("Phone number already registered: " + phone);
                    }
                });
                vendor.setPhoneNumber(phone);
            }
        }
        if (request.getVendorName() != null) vendor.setVendorName(request.getVendorName());
        vendor.setAlternatePhoneNumber(request.getAlternatePhoneNumber());
        vendor.setAddress(request.getAddress());
        return mapToResponse(vendorRepository.save(vendor), link);
    }

    public VendorResponse setActive(Long vendorId, boolean active, Long locationId) {
        VendorLocation link = findOwnedLink(vendorId, locationId);
        link.setIsActive(active);
        return mapToResponse(link.getVendor(), vendorLocationRepository.save(link));
    }

    @Transactional(readOnly = true)
    public VendorResponse getVendor(Long vendorId, Long locationId) {
        VendorLocation link = findOwnedLink(vendorId, locationId);
        return mapToResponse(link.getVendor(), link);
    }

    /** Throws if the vendor is not linked to this location (surfaced as 404). */
    private VendorLocation findOwnedLink(Long vendorId, Long locationId) {
        return vendorLocationRepository.findByVendorIdAndLocationId(vendorId, locationId)
                .orElseThrow(() -> new NoSuchElementException("Vendor not found: " + vendorId));
    }

    private String normalizePhone(String raw) {
        try {
            return PhoneNumberNormalizer.normalize(raw);
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("invalid_phone_number", exception);
        }
    }

    private VendorResponse mapToResponse(Vendor vendor, VendorLocation link) {
        VendorResponse response = new VendorResponse();
        response.setId(vendor.getId());
        response.setVendorName(vendor.getVendorName());
        response.setPhoneNumber(vendor.getPhoneNumber());
        response.setAlternatePhoneNumber(vendor.getAlternatePhoneNumber());
        response.setAddress(vendor.getAddress());
        response.setLocationId(link.getLocation().getId());
        response.setIsActive(link.getIsActive());
        response.setCreatedAt(vendor.getCreatedAt());
        response.setUpdatedAt(vendor.getUpdatedAt());
        return response;
    }
}
