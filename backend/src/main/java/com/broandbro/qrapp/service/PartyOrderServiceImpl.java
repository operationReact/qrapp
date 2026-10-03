package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.partyorder.*;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.PartyOrder;
import com.broandbro.qrapp.entity.PartyOrderMenuItem;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.PartyOrderStatus;
import com.broandbro.qrapp.repository.PartyOrderMenuItemRepository;
import com.broandbro.qrapp.repository.PartyOrderRepository;
import com.broandbro.qrapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PartyOrderServiceImpl implements PartyOrderService {

    private static final int DEFAULT_ESTIMATE_EXPIRY_HOURS = 48;
    private static final BigDecimal ADVANCE_PERCENTAGE = new BigDecimal("0.30");

    private final PartyOrderRepository         partyOrderRepo;
    private final UserRepository               userRepo;
    private final PartyOrderMenuItemRepository menuItemRepo;

    // =========================================================================
    // USER OPERATIONS
    // =========================================================================

    @Override
    @Transactional
    public PartyOrderResponse createPartyOrder(PartyOrderCreateRequest req, String phone) {
        User user = requireUser(phone);

        PartyOrder po = PartyOrder.builder()
                .userId(user.getId())
                .userPhone(user.getPhone())
                .userName(user.getName())
                .location(user.getDefaultLocation())
                .eventDateTime(req.eventDateTime())
                .numberOfPeople(req.numberOfPeople())
                .venue(req.venue())
                .eventType(req.eventType())
                .orderType(req.orderType() == null ? "PARTY" : req.orderType())
                .specialNotes(req.specialNotes())
                .budgetAmount(req.budgetAmount())
                .status(PartyOrderStatus.NEW)
                .currency("INR")
                .build();

        po = partyOrderRepo.save(po);

        List<PartyOrderMenuItem> items = normalizeMenuItems(req.menuItems(), po);
        menuItemRepo.saveAll(items);
        po.getMenuItems().addAll(items);

        log.info("[PartyOrder] Created partyOrderId={} by userId={} with {} menu items",
                po.getId(), user.getId(), items.size());
        return PartyOrderResponse.forUser(po);
    }

    @Override
    public List<PartyOrderResponse> getMyPartyOrders(String phone) {
        User user = requireUser(phone);
        return partyOrderRepo.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(po -> {
                    checkAndExpireEstimate(po);
                    return PartyOrderResponse.forUser(po);
                })
                .toList();
    }

    @Override
    public PartyOrderResponse getMyPartyOrder(Long orderId, String phone) {
        User user = requireUser(phone);
        PartyOrder po = requireOwnedOrder(orderId, user.getId());
        checkAndExpireEstimate(po);
        return PartyOrderResponse.forUser(po);
    }

    @Override
    @Transactional
    public PartyOrderResponse acceptEstimate(Long orderId, String phone) {
        User user = requireUser(phone);
        PartyOrder po = requireOwnedOrder(orderId, user.getId());

        checkAndExpireEstimate(po);

        if (po.getStatus() == PartyOrderStatus.ESTIMATE_EXPIRED) {
            throw new ResponseStatusException(HttpStatus.GONE, "Estimate has expired");
        }
        if (po.getStatus() != PartyOrderStatus.ESTIMATE_SENT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Order is not in ESTIMATE_SENT state; current: " + po.getStatus());
        }

        BigDecimal totalAmount = po.getEstimatedTotalAmount() != null
                ? po.getEstimatedTotalAmount() : po.getEstimatedAmount();
        if (totalAmount == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No estimate amount set");
        }

        BigDecimal advanceRequired = totalAmount
                .multiply(ADVANCE_PERCENTAGE)
                .setScale(2, RoundingMode.HALF_UP);

        po.setStatus(PartyOrderStatus.ADVANCE_PENDING);
        po.setAdvanceRequiredAmount(advanceRequired);
        po.setUserRespondedAt(Instant.now());
        po = partyOrderRepo.save(po);
        log.info("[PartyOrder] Accepted by userId={}, partyOrderId={}, advanceRequired={}",
                user.getId(), po.getId(), advanceRequired);
        return PartyOrderResponse.forUser(po);
    }

    @Override
    @Transactional
    public PartyOrderResponse rejectEstimate(Long orderId, String phone) {
        User user = requireUser(phone);
        PartyOrder po = requireOwnedOrder(orderId, user.getId());

        if (po.getStatus() != PartyOrderStatus.ESTIMATE_SENT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Order is not in ESTIMATE_SENT state; current: " + po.getStatus());
        }

        po.setStatus(PartyOrderStatus.REJECTED);
        po.setUserRespondedAt(Instant.now());
        po = partyOrderRepo.save(po);
        log.info("[PartyOrder] Rejected by userId={}, partyOrderId={}", user.getId(), po.getId());
        return PartyOrderResponse.forUser(po);
    }

    @Override
    @Transactional
    public PartyOrderResponse payAdvance(Long orderId, String phone) {
        User user = requireUser(phone);
        PartyOrder po = requireOwnedOrder(orderId, user.getId());

        if (po.getStatus() != PartyOrderStatus.ADVANCE_PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Order is not in ADVANCE_PENDING state; current: " + po.getStatus());
        }
        if (Boolean.TRUE.equals(po.getAdvancePaid())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Advance already paid");
        }

        Instant now = Instant.now();
        po.setAdvancePaid(true);
        po.setAdvancePaidAmount(po.getAdvanceRequiredAmount());
        po.setAdvancePaidAt(now);
        po.setConfirmationStartedAt(now);
        po.setEventCountdownStarted(true);
        po.setStatus(PartyOrderStatus.CONFIRMED);
        po = partyOrderRepo.save(po);
        log.info("[PartyOrder] Advance paid by userId={}, partyOrderId={}", user.getId(), po.getId());
        return PartyOrderResponse.forUser(po);
    }

    @Override
    @Transactional
    public PartyOrderResponse payBalance(Long orderId, String phone) {
        User user = requireUser(phone);
        PartyOrder po = requireOwnedOrder(orderId, user.getId());

        if (po.getStatus() != PartyOrderStatus.DELIVERED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Order is not in DELIVERED state; current: " + po.getStatus());
        }
        if (Boolean.TRUE.equals(po.getBalancePaid())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Balance already paid");
        }

        Instant now = Instant.now();
        po.setBalancePaid(true);
        po.setBalancePaidAmount(po.getBalanceAmount());
        po.setBalancePaidAt(now);
        po.setStatus(PartyOrderStatus.COMPLETED);
        po = partyOrderRepo.save(po);
        log.info("[PartyOrder] Balance paid by userId={}, partyOrderId={}, amount={}", user.getId(), po.getId(), po.getBalancePaidAmount());
        return PartyOrderResponse.forUser(po);
    }

    @Override
    @Transactional
    public PartyOrderResponse requestCallback(Long orderId, String phone) {
        User user = requireUser(phone);
        PartyOrder po = requireOwnedOrder(orderId, user.getId());
        po.setCallbackRequested(true);
        po = partyOrderRepo.save(po);
        log.info("[PartyOrder] Callback requested by userId={}, partyOrderId={}", user.getId(), po.getId());
        return PartyOrderResponse.forUser(po);
    }

    @Override
    @Transactional
    public PartyOrderResponse cancelMyOrder(Long orderId, String phone) {
        User user = requireUser(phone);
        PartyOrder po = requireOwnedOrder(orderId, user.getId());

        if (po.getStatus() != PartyOrderStatus.NEW
                && po.getStatus() != PartyOrderStatus.UNDER_REVIEW
                && po.getStatus() != PartyOrderStatus.PENDING_ESTIMATE
                && po.getStatus() != PartyOrderStatus.ESTIMATE_SENT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Order cannot be cancelled in current status: " + po.getStatus());
        }

        po.setStatus(PartyOrderStatus.CANCELLED);
        po.setUserRespondedAt(Instant.now());
        po = partyOrderRepo.save(po);
        log.info("[PartyOrder] Cancelled by userId={}, partyOrderId={}", user.getId(), po.getId());
        return PartyOrderResponse.forUser(po);
    }

    // =========================================================================
    // ADMIN OPERATIONS
    // =========================================================================

    @Override
    public List<PartyOrderResponse> getAllPartyOrders(Optional<List<Long>> locationScope) {
        List<PartyOrder> orders = isUnfiltered(locationScope)
                ? partyOrderRepo.findAllByOrderByCreatedAtDesc()
                : partyOrderRepo.findByLocationIdInOrderByCreatedAtDesc(scopeIdsOrSentinel(locationScope));
        return orders.stream()
                .map(po -> {
                    checkAndExpireEstimate(po);
                    return PartyOrderResponse.forAdmin(po);
                })
                .toList();
    }

    @Override
    public List<PartyOrderResponse> getPartyOrdersByStatus(PartyOrderStatus status,
                                                           Optional<List<Long>> locationScope) {
        List<PartyOrder> orders = isUnfiltered(locationScope)
                ? partyOrderRepo.findByStatusOrderByCreatedAtDesc(status)
                : partyOrderRepo.findByStatusAndLocationIdInOrderByCreatedAtDesc(
                        status, scopeIdsOrSentinel(locationScope));
        return orders.stream()
                .map(PartyOrderResponse::forAdmin)
                .toList();
    }

    @Override
    public PartyOrderResponse getPartyOrderById(Long orderId, Optional<List<Long>> locationScope) {
        PartyOrder po = requireOrder(orderId);
        assertWithinScope(po, locationScope);
        checkAndExpireEstimate(po);
        return PartyOrderResponse.forAdmin(po);
    }

    @Override
    @Transactional
    public PartyOrderResponse submitEstimate(Long orderId, PartyOrderEstimateRequest req, String adminName,
                                             Optional<List<Long>> locationScope) {
        PartyOrder po = requireOrder(orderId);
        assertWithinScope(po, locationScope);

        if (po.getStatus() != PartyOrderStatus.PENDING_ESTIMATE
                && po.getStatus() != PartyOrderStatus.NEW
                && po.getStatus() != PartyOrderStatus.UNDER_REVIEW) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Estimate can only be submitted when status is NEW, UNDER_REVIEW or PENDING_ESTIMATE; current: " + po.getStatus());
        }

        // Handle per-item estimate
        if (req.menuItems() != null && !req.menuItems().isEmpty()) {
            // Clear existing items and replace with priced ones
            po.getMenuItems().clear();
            final PartyOrder savedPo = partyOrderRepo.save(po); // flush orphan removals

            int people = po.getNumberOfPeople() != null ? po.getNumberOfPeople() : 1;
            BigDecimal peopleMultiplier = BigDecimal.valueOf(people);

            BigDecimal totalAmount = BigDecimal.ZERO;
            BigDecimal totalExpense = BigDecimal.ZERO;

            List<PartyOrderMenuItem> pricedItems = req.menuItems().stream().map(itemReq -> {
                // quotedPrice and estimatedCost are stored as PER-PERSON values
                BigDecimal perPersonProfit = itemReq.quotedPrice()
                        .subtract(itemReq.estimatedCost())
                        .setScale(2, RoundingMode.HALF_UP);
                return PartyOrderMenuItem.builder()
                        .partyOrder(savedPo)
                        .itemName(itemReq.itemName().trim())
                        .notes(itemReq.notes())
                        .quotedPrice(itemReq.quotedPrice().setScale(2, RoundingMode.HALF_UP))        // per person
                        .estimatedCost(itemReq.estimatedCost().setScale(2, RoundingMode.HALF_UP))   // per person
                        .estimatedProfit(perPersonProfit)                                            // per person
                        .build();
            }).collect(Collectors.toList());

            // Totals = per-person price × number of people
            for (PartyOrderMenuItemEstimate itemReq : req.menuItems()) {
                totalAmount = totalAmount.add(itemReq.quotedPrice().multiply(peopleMultiplier));
                totalExpense = totalExpense.add(itemReq.estimatedCost().multiply(peopleMultiplier));
            }
            totalAmount = totalAmount.setScale(2, RoundingMode.HALF_UP);
            totalExpense = totalExpense.setScale(2, RoundingMode.HALF_UP);
            BigDecimal totalProfit = totalAmount.subtract(totalExpense).setScale(2, RoundingMode.HALF_UP);

            menuItemRepo.saveAll(pricedItems);
            po.getMenuItems().addAll(pricedItems);

            po.setEstimatedTotalAmount(totalAmount);
            po.setEstimatedTotalExpense(totalExpense);
            po.setEstimatedTotalProfit(totalProfit);
            po.setEstimatedAmount(totalAmount); // keep legacy field in sync
        } else if (req.estimatedAmount() != null) {
            // Backward-compat: single amount
            po.setEstimatedAmount(req.estimatedAmount().setScale(2, RoundingMode.HALF_UP));
            po.setEstimatedTotalAmount(req.estimatedAmount().setScale(2, RoundingMode.HALF_UP));
        }

        int expiryHours = (req.estimateExpiryHours() != null && req.estimateExpiryHours() > 0)
                ? req.estimateExpiryHours() : DEFAULT_ESTIMATE_EXPIRY_HOURS;

        Instant now = Instant.now();
        po.setCurrency(req.currency() != null ? req.currency() : "INR");
        po.setEstimateNote(req.estimateNote());
        po.setAdminNotes(req.adminNotes());
        po.setEstimateSubmittedBy(adminName);
        po.setEstimateSentAt(now);
        po.setEstimateExpiresAt(now.plus(expiryHours, ChronoUnit.HOURS));
        po.setStatus(PartyOrderStatus.ESTIMATE_SENT);

        po = partyOrderRepo.save(po);
        log.info("[PartyOrder] Estimate submitted by admin='{}' for partyOrderId={}, total={}",
                adminName, po.getId(), po.getEstimatedTotalAmount());
        return PartyOrderResponse.forAdmin(po);
    }

    @Override
    @Transactional
    public PartyOrderResponse updateStatus(Long orderId, PartyOrderStatusUpdateRequest req, String adminName,
                                           Optional<List<Long>> locationScope) {
        PartyOrder po = requireOrder(orderId);
        assertWithinScope(po, locationScope);
        PartyOrderStatus prev = po.getStatus();
        po.setStatus(req.status());
        po = partyOrderRepo.save(po);
        log.info("[PartyOrder] Admin='{}' changed partyOrderId={} status: {} → {}",
                adminName, orderId, prev, req.status());
        return PartyOrderResponse.forAdmin(po);
    }

    @Override
    @Transactional
    public PartyOrderResponse markDelivered(Long orderId, String adminName, Optional<List<Long>> locationScope) {
        PartyOrder po = requireOrder(orderId);
        assertWithinScope(po, locationScope);

        if (po.getStatus() != PartyOrderStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Order must be CONFIRMED to mark as DELIVERED; current: " + po.getStatus());
        }

        BigDecimal total = po.getEstimatedTotalAmount() != null
                ? po.getEstimatedTotalAmount() : po.getEstimatedAmount();
        if (total == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No total amount set on order");
        }

        BigDecimal advancePaid = po.getAdvancePaidAmount() != null
                ? po.getAdvancePaidAmount() : BigDecimal.ZERO;
        BigDecimal balance = total.subtract(advancePaid).setScale(2, RoundingMode.HALF_UP);

        po.setBalanceAmount(balance);
        po.setBalancePaid(false);
        po.setDeliveredAt(Instant.now());
        po.setStatus(PartyOrderStatus.DELIVERED);
        po = partyOrderRepo.save(po);
        log.info("[PartyOrder] Admin='{}' marked partyOrderId={} as DELIVERED, balanceDue={}", adminName, orderId, balance);
        return PartyOrderResponse.forAdmin(po);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Auto-expire estimate if past expiry time. Saves the updated status.
     * Uses its own writable transaction via REQUIRES_NEW so it works from read-only callers.
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void checkAndExpireEstimate(PartyOrder po) {
        if (po.getStatus() == PartyOrderStatus.ESTIMATE_SENT
                && po.getEstimateExpiresAt() != null
                && Instant.now().isAfter(po.getEstimateExpiresAt())) {
            po.setStatus(PartyOrderStatus.ESTIMATE_EXPIRED);
            partyOrderRepo.save(po);
            log.info("[PartyOrder] Auto-expired estimate for partyOrderId={}", po.getId());
        }
    }

    private User requireUser(String phone) {
        return userRepo.findByPhone(phone)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "User not found for phone: " + phone));
    }

    private PartyOrder requireOrder(Long orderId) {
        return partyOrderRepo.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Party order not found: " + orderId));
    }

    private PartyOrder requireOwnedOrder(Long orderId, Long userId) {
        PartyOrder po = requireOrder(orderId);
        if (!po.getUserId().equals(userId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Access denied to party order: " + orderId);
        }
        return po;
    }

    // ── Location scope helpers ───────────────────────────────────────────────

    /** True when the scope imposes no filter (SUPER_ADMIN "All Locations"). */
    private boolean isUnfiltered(Optional<List<Long>> locationScope) {
        return locationScope == null || locationScope.isEmpty();
    }

    /**
     * Flattens the scope to the list of visible location IDs. A sentinel {@code -1}
     * is used when the caller can access nothing so the SQL {@code IN} clause always
     * parses and yields an empty result set.
     */
    private List<Long> scopeIdsOrSentinel(Optional<List<Long>> locationScope) {
        List<Long> ids = locationScope.get();
        return ids.isEmpty() ? List.of(-1L) : ids;
    }

    /** Rejects access to a party order that falls outside the caller's location scope. */
    private void assertWithinScope(PartyOrder po, Optional<List<Long>> locationScope) {
        if (isUnfiltered(locationScope)) {
            return;
        }
        Location location = po.getLocation();
        Long locationId = location != null ? location.getId() : null;
        if (locationId == null || !locationScope.get().contains(locationId)) {
            throw new AccessDeniedException("location_access_denied");
        }
    }

    private List<PartyOrderMenuItem> normalizeMenuItems(List<String> raw, PartyOrder parent) {
        if (raw == null) return List.of();
        return raw.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toLowerCase)
                .distinct()
                .map(name -> {
                    // Restore original capitalization: capitalize each word
                    String displayName = capitalizeWords(name);
                    return PartyOrderMenuItem.builder()
                            .partyOrder(parent)
                            .itemName(displayName)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private String capitalizeWords(String s) {
        if (s == null || s.isEmpty()) return s;
        String[] words = s.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (!w.isEmpty()) {
                sb.append(Character.toUpperCase(w.charAt(0)));
                if (w.length() > 1) sb.append(w.substring(1));
                sb.append(" ");
            }
        }
        return sb.toString().trim();
    }
}
