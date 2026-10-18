package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.CreateUserRequest;
import com.broandbro.qrapp.dto.UserResponse;
import com.broandbro.qrapp.dto.VendorAccountResponse;
import com.broandbro.qrapp.dto.VendorBillRequest;
import com.broandbro.qrapp.dto.VendorBillResponse;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.UserLocationAccess;
import com.broandbro.qrapp.entity.UserRole;
import com.broandbro.qrapp.entity.VendorBill;
import com.broandbro.qrapp.entity.VendorBillEvent;
import com.broandbro.qrapp.entity.VendorBillItem;
import com.broandbro.qrapp.enums.VendorBillEventType;
import com.broandbro.qrapp.enums.VendorBillStatus;
import com.broandbro.qrapp.otp.PhoneNumberNormalizer;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.UserLocationAccessRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.repository.VendorBillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;

/**
 * Vendor bill workflow for location-scoped VENDOR logins.
 *
 * <p>Flow: DRAFT -> SUBMITTED -> APPROVED -> PAID, with CORRECTION_REQUESTED sent back
 * to the vendor for edits and resubmission. Comments may be added by the owning vendor
 * or by any admin of the same location at any stage.
 */
@Service
@RequiredArgsConstructor
public class VendorBillService {
    static final int MAX_ITEMS = 100;
    static final int MAX_MESSAGE_LENGTH = 1000;
    static final Set<String> PAYMENT_METHODS = Set.of("CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER");
    private static final Set<UserRole> ADMIN_ROLES = Set.of(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER);

    private final VendorBillRepository billRepository;
    private final UserLocationAccessRepository accessRepository;
    private final LocationRepository locationRepository;
    private final UserService userService;
    private final VendorService vendorService;
    private final UserRepository userRepository;

    // ----- vendor side -----

    @Transactional(readOnly = true)
    public List<VendorBillResponse> listForVendor(User vendor, Long locationId) {
        requireRole(vendor, locationId, Set.of(UserRole.VENDOR));
        return billRepository.findByLocationIdAndVendorUserIdOrderByCreatedAtDesc(locationId, vendor.getId())
                .stream().map(VendorBillResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public VendorBillResponse getForVendor(User vendor, Long locationId, Long billId) {
        requireRole(vendor, locationId, Set.of(UserRole.VENDOR));
        return VendorBillResponse.from(findOwnedBill(vendor, locationId, billId));
    }

    @Transactional
    public VendorBillResponse createForVendor(User vendor, Long locationId, VendorBillRequest request, boolean submit) {
        UserRole role = requireRole(vendor, locationId, Set.of(UserRole.VENDOR));
        Location location = activeLocation(locationId);
        VendorBill bill = new VendorBill();
        bill.setLocation(location);
        bill.setVendorUser(vendor);
        bill.setStatus(VendorBillStatus.DRAFT);
        applyDraft(bill, vendor, request);
        addEvent(bill, vendor, role, VendorBillEventType.CREATED, null);
        if (submit) {
            submit(bill, vendor, role);
        }
        return VendorBillResponse.from(billRepository.save(bill));
    }

    @Transactional
    public VendorBillResponse updateForVendor(User vendor, Long locationId, Long billId,
                                              VendorBillRequest request, boolean submit) {
        UserRole role = requireRole(vendor, locationId, Set.of(UserRole.VENDOR));
        VendorBill bill = findOwnedBill(vendor, locationId, billId);
        if (bill.getStatus() != VendorBillStatus.DRAFT && bill.getStatus() != VendorBillStatus.CORRECTION_REQUESTED) {
            throw new IllegalStateException("bill_not_editable");
        }
        applyDraft(bill, vendor, request);
        if (submit) {
            submit(bill, vendor, role);
        }
        return VendorBillResponse.from(billRepository.save(bill));
    }

    // ----- admin side -----

    @Transactional(readOnly = true)
    public List<VendorBillResponse> listForAdmin(User admin, Long locationId, VendorBillStatus status) {
        requireAdmin(admin, locationId);
        List<VendorBill> bills = status == null
                ? billRepository.findByLocationIdOrderByCreatedAtDesc(locationId)
                : billRepository.findByLocationIdAndStatusOrderByCreatedAtDesc(locationId, status);
        return bills.stream().map(VendorBillResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public VendorBillResponse getForAdmin(User admin, Long locationId, Long billId) {
        requireAdmin(admin, locationId);
        return VendorBillResponse.from(findBill(locationId, billId));
    }

    @Transactional
    public VendorBillResponse approve(User admin, Long locationId, Long billId, String message) {
        UserRole role = requireAdmin(admin, locationId);
        VendorBill bill = findBill(locationId, billId);
        requireStatus(bill, VendorBillStatus.SUBMITTED);
        bill.setStatus(VendorBillStatus.APPROVED);
        bill.setApprovedAt(Instant.now());
        bill.setApprovedBy(admin.getName());
        addEvent(bill, admin, role, VendorBillEventType.APPROVED, normalizeMessage(message));
        return VendorBillResponse.from(billRepository.save(bill));
    }

    @Transactional
    public VendorBillResponse requestCorrection(User admin, Long locationId, Long billId, String message) {
        UserRole role = requireAdmin(admin, locationId);
        VendorBill bill = findBill(locationId, billId);
        requireStatus(bill, VendorBillStatus.SUBMITTED);
        String note = normalizeMessage(message);
        if (note == null) {
            throw new IllegalArgumentException("correction_message_required");
        }
        bill.setStatus(VendorBillStatus.CORRECTION_REQUESTED);
        addEvent(bill, admin, role, VendorBillEventType.CORRECTION_REQUESTED, note);
        return VendorBillResponse.from(billRepository.save(bill));
    }

    @Transactional
    public VendorBillResponse recordPayment(User admin, Long locationId, Long billId,
                                            String paymentMethod, String paymentReference) {
        UserRole role = requireAdmin(admin, locationId);
        VendorBill bill = findBill(locationId, billId);
        requireStatus(bill, VendorBillStatus.APPROVED);
        String method = paymentMethod == null ? "" : paymentMethod.trim().toUpperCase();
        if (!PAYMENT_METHODS.contains(method)) {
            throw new IllegalArgumentException("invalid_payment_method");
        }
        String reference = normalizeMessage(paymentReference);
        bill.setStatus(VendorBillStatus.PAID);
        bill.setPaymentMethod(method);
        bill.setPaymentReference(reference);
        bill.setPaidAmount(bill.getTotalAmount());
        bill.setPaidAt(Instant.now());
        bill.setPaidBy(admin.getName());
        String note = "Paid " + bill.getTotalAmount().toPlainString() + " via " + method
                + (reference == null ? "" : " (ref " + reference + ")");
        addEvent(bill, admin, role, VendorBillEventType.PAID, note);
        return VendorBillResponse.from(billRepository.save(bill));
    }

    // ----- comments (vendor owner or location admin) -----

    @Transactional
    public VendorBillResponse addComment(User actor, Long locationId, Long billId, String message) {
        String note = normalizeMessage(message);
        if (note == null) {
            throw new IllegalArgumentException("comment_required");
        }
        VendorBill bill = findBill(locationId, billId);
        UserRole role;
        if (bill.getVendorUser().getId().equals(actor.getId())) {
            role = requireRole(actor, locationId, Set.of(UserRole.VENDOR));
        } else {
            role = requireAdmin(actor, locationId);
        }
        addEvent(bill, actor, role, VendorBillEventType.COMMENT, note);
        return VendorBillResponse.from(billRepository.save(bill));
    }

    // ----- vendor account onboarding -----

    @Transactional(readOnly = true)
    public List<VendorAccountResponse> listVendorAccounts(User admin, Long locationId) {
        requireAdmin(admin, locationId);
        return accessRepository.findByLocationId(locationId).stream()
                .filter(access -> access.getRole() == UserRole.VENDOR)
                .map(access -> new VendorAccountResponse(access.getUser().getId(), access.getUser().getName(),
                        access.getUser().getPhone(), access.getActive()))
                .toList();
    }

    @Transactional
    public UserResponse onboardVendor(User admin, CreateUserRequest request) {
        requireAdmin(admin, request.getLocationId());
        request.setRole(UserRole.VENDOR);
        Optional<User> existing = userRepository.findByPhone(normalizeVendorPhone(request.getPhone()));
        if (existing.isEmpty()) {
            return userService.createInternalUser(request);
        }
        return grantVendorAccess(existing.get(), request.getLocationId());
    }

    /** Existing Broand Bro accounts keep their credentials; the location simply gets VENDOR access. */
    private UserResponse grantVendorAccess(User user, Long locationId) {
        if (vendorService.isStaffAccount(user)) {
            throw new IllegalStateException("phone_belongs_to_staff");
        }
        Optional<UserLocationAccess> current = accessRepository.findByUserIdAndLocationId(user.getId(), locationId);
        if (current.isPresent() && current.get().getRole() == UserRole.VENDOR) {
            throw new IllegalStateException("vendor_login_exists_here");
        }
        if (current.isPresent()) {
            current.get().setRole(UserRole.VENDOR);
            current.get().setActive(true);
            accessRepository.save(current.get());
        } else {
            Location location = locationRepository.findById(locationId)
                    .filter(l -> Boolean.TRUE.equals(l.getActive()))
                    .orElseThrow(() -> new IllegalArgumentException("location_not_found"));
            accessRepository.save(UserLocationAccess.builder()
                    .user(user).location(location).active(true).role(UserRole.VENDOR).build());
        }
        return userService.toResponse(user);
    }

    private String normalizeVendorPhone(String raw) {
        try {
            return PhoneNumberNormalizer.normalize(raw);
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("invalid_phone_number", exception);
        }
    }

    @Transactional
    public void setVendorAccountActive(User admin, Long locationId, Long vendorUserId, boolean active) {
        requireAdmin(admin, locationId);
        UserLocationAccess access = vendorAccess(locationId, vendorUserId);
        access.setActive(active);
        accessRepository.save(access);
    }

    @Transactional
    public UserResponse resetVendorPassword(User admin, Long locationId, Long vendorUserId, String newPassword) {
        requireAdmin(admin, locationId);
        vendorAccess(locationId, vendorUserId);
        return userService.resetPasswordByAdmin(vendorUserId, newPassword);
    }

    // ----- helpers -----

    private void submit(VendorBill bill, User actor, UserRole role) {
        if (bill.getItems().isEmpty()) {
            throw new IllegalArgumentException("items_required");
        }
        bill.setStatus(VendorBillStatus.SUBMITTED);
        bill.setSubmittedAt(Instant.now());
        addEvent(bill, actor, role, VendorBillEventType.SUBMITTED, null);
    }

    private void applyDraft(VendorBill bill, User vendor, VendorBillRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("bill_required");
        }
        String invoiceNumber = request.invoiceNumber() == null ? "" : request.invoiceNumber().trim();
        if (invoiceNumber.isEmpty() || invoiceNumber.length() > 80) {
            throw new IllegalArgumentException("invoice_number_invalid");
        }
        if (request.invoiceDate() == null) {
            throw new IllegalArgumentException("invoice_date_required");
        }
        List<VendorBillRequest.ItemRequest> requestItems = request.items() == null ? List.of() : request.items();
        if (requestItems.size() > MAX_ITEMS) {
            throw new IllegalArgumentException("too_many_items");
        }

        bill.setVendorName(vendor.getName());
        bill.setInvoiceNumber(invoiceNumber);
        bill.setInvoiceDate(request.invoiceDate());
        bill.setNotes(normalizeMessage(request.notes()));

        bill.getItems().clear();
        BigDecimal total = BigDecimal.ZERO;
        int order = 0;
        for (VendorBillRequest.ItemRequest itemRequest : requestItems) {
            VendorBillItem item = new VendorBillItem();
            item.setBill(bill);
            item.setDescription(requireText(itemRequest.description(), 200, "item_description_invalid"));
            if (itemRequest.quantity() == null || itemRequest.quantity().signum() <= 0) {
                throw new IllegalArgumentException("item_quantity_invalid");
            }
            if (itemRequest.unitPrice() == null || itemRequest.unitPrice().signum() < 0) {
                throw new IllegalArgumentException("item_price_invalid");
            }
            item.setQuantity(itemRequest.quantity().setScale(3, RoundingMode.HALF_UP));
            String unit = itemRequest.unit() == null ? "" : itemRequest.unit().trim();
            if (unit.length() > 20) {
                throw new IllegalArgumentException("item_unit_invalid");
            }
            item.setUnit(unit.isEmpty() ? null : unit);
            item.setUnitPrice(itemRequest.unitPrice().setScale(2, RoundingMode.HALF_UP));
            item.setLineTotal(item.getQuantity().multiply(item.getUnitPrice()).setScale(2, RoundingMode.HALF_UP));
            item.setSortOrder(order++);
            bill.getItems().add(item);
            total = total.add(item.getLineTotal());
        }
        bill.setTotalAmount(total.setScale(2, RoundingMode.HALF_UP));
    }

    private void addEvent(VendorBill bill, User actor, UserRole role, VendorBillEventType type, String message) {
        VendorBillEvent event = new VendorBillEvent();
        event.setBill(bill);
        event.setActorUserId(actor.getId());
        event.setActorName(actor.getName());
        event.setActorRole(role.name());
        event.setEventType(type);
        event.setMessage(message);
        bill.getEvents().add(event);
    }

    private void requireStatus(VendorBill bill, VendorBillStatus expected) {
        if (bill.getStatus() != expected) {
            throw new IllegalStateException("invalid_status_transition");
        }
    }

    private VendorBill findBill(Long locationId, Long billId) {
        return billRepository.findByIdAndLocationId(billId, locationId)
                .orElseThrow(() -> new NoSuchElementException("vendor_bill_not_found"));
    }

    private VendorBill findOwnedBill(User vendor, Long locationId, Long billId) {
        VendorBill bill = findBill(locationId, billId);
        if (!bill.getVendorUser().getId().equals(vendor.getId())) {
            throw new AccessDeniedException("vendor_bill_access_denied");
        }
        return bill;
    }

    private UserLocationAccess vendorAccess(Long locationId, Long vendorUserId) {
        return accessRepository.findByUserIdAndLocationId(vendorUserId, locationId)
                .filter(access -> access.getRole() == UserRole.VENDOR)
                .orElseThrow(() -> new NoSuchElementException("vendor_account_not_found"));
    }

    private Location activeLocation(Long locationId) {
        return locationRepository.findById(locationId)
                .filter(location -> Boolean.TRUE.equals(location.getActive()))
                .orElseThrow(() -> new IllegalArgumentException("location_not_found"));
    }

    private UserRole requireAdmin(User user, Long locationId) {
        return requireRole(user, locationId, ADMIN_ROLES);
    }

    /**
     * Returns the caller's effective role at the location, or throws AccessDeniedException
     * when the caller has no active grant there with one of the allowed roles.
     */
    private UserRole requireRole(User user, Long locationId, Set<UserRole> allowed) {
        if (user == null || locationId == null) {
            throw new AccessDeniedException("location_access_denied");
        }
        boolean superAdmin = user.getRole() == UserRole.SUPER_ADMIN || Boolean.TRUE.equals(user.getIsSuperUser());
        if (superAdmin && allowed.stream().anyMatch(ADMIN_ROLES::contains)) {
            activeLocation(locationId);
            return UserRole.SUPER_ADMIN;
        }
        UserRole role = accessRepository.findByUserIdAndLocationId(user.getId(), locationId)
                .filter(access -> Boolean.TRUE.equals(access.getActive())
                        && access.getLocation() != null
                        && Boolean.TRUE.equals(access.getLocation().getActive()))
                .map(UserLocationAccess::getRole)
                .orElse(null);
        if (role == null || !allowed.contains(role)) {
            throw new AccessDeniedException("location_access_denied");
        }
        return role;
    }

    private static String requireText(String value, int maxLength, String error) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty() || trimmed.length() > maxLength) {
            throw new IllegalArgumentException(error);
        }
        return trimmed;
    }

    private static String normalizeMessage(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.isEmpty()) return null;
        if (trimmed.length() > MAX_MESSAGE_LENGTH) {
            throw new IllegalArgumentException("message_too_long");
        }
        return trimmed;
    }
}
