package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.partyorder.*;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PartyOrderServiceImpl implements PartyOrderService {

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
                .eventDateTime(req.eventDateTime())
                .numberOfPeople(req.numberOfPeople())
                .venue(req.venue())
                .eventType(req.eventType())
                .specialNotes(req.specialNotes())
                .status(PartyOrderStatus.NEW)
                .currency("INR")
                .build();

        // Persist parent first to get the PK for the FK
        po = partyOrderRepo.save(po);

        // Normalise, deduplicate and persist menu items
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
                .map(PartyOrderResponse::forUser)
                .toList();
    }

    @Override
    public PartyOrderResponse getMyPartyOrder(Long orderId, String phone) {
        User user = requireUser(phone);
        PartyOrder po = requireOwnedOrder(orderId, user.getId());
        return PartyOrderResponse.forUser(po);
    }

    @Override
    @Transactional
    public PartyOrderResponse confirmEstimate(Long orderId, String phone) {
        User user = requireUser(phone);
        PartyOrder po = requireOwnedOrder(orderId, user.getId());

        if (po.getStatus() != PartyOrderStatus.ESTIMATE_SENT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Order is not in ESTIMATE_SENT state; current status: " + po.getStatus());
        }

        po.setStatus(PartyOrderStatus.CONFIRMED);
        po.setUserRespondedAt(Instant.now());
        po = partyOrderRepo.save(po);
        log.info("[PartyOrder] Confirmed by userId={}, partyOrderId={}", user.getId(), po.getId());
        return PartyOrderResponse.forUser(po);
    }

    @Override
    @Transactional
    public PartyOrderResponse rejectEstimate(Long orderId, String phone) {
        User user = requireUser(phone);
        PartyOrder po = requireOwnedOrder(orderId, user.getId());

        if (po.getStatus() != PartyOrderStatus.ESTIMATE_SENT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Order is not in ESTIMATE_SENT state; current status: " + po.getStatus());
        }

        po.setStatus(PartyOrderStatus.REJECTED);
        po.setUserRespondedAt(Instant.now());
        po = partyOrderRepo.save(po);
        log.info("[PartyOrder] Rejected by userId={}, partyOrderId={}", user.getId(), po.getId());
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
    public List<PartyOrderResponse> getAllPartyOrders() {
        return partyOrderRepo.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(PartyOrderResponse::forAdmin)
                .toList();
    }

    @Override
    public List<PartyOrderResponse> getPartyOrdersByStatus(PartyOrderStatus status) {
        return partyOrderRepo.findByStatusOrderByCreatedAtDesc(status)
                .stream()
                .map(PartyOrderResponse::forAdmin)
                .toList();
    }

    @Override
    public PartyOrderResponse getPartyOrderById(Long orderId) {
        return PartyOrderResponse.forAdmin(requireOrder(orderId));
    }

    @Override
    @Transactional
    public PartyOrderResponse submitEstimate(Long orderId, PartyOrderEstimateRequest req, String adminName) {
        PartyOrder po = requireOrder(orderId);

        if (po.getStatus() != PartyOrderStatus.PENDING_ESTIMATE
                && po.getStatus() != PartyOrderStatus.NEW
                && po.getStatus() != PartyOrderStatus.UNDER_REVIEW) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Estimate can only be submitted when status is NEW, UNDER_REVIEW or PENDING_ESTIMATE; current: " + po.getStatus());
        }

        po.setEstimatedAmount(req.estimatedAmount());
        po.setCurrency(req.currency() != null ? req.currency() : "INR");
        po.setEstimateNote(req.estimateNote());
        po.setEstimateSubmittedBy(adminName);
        po.setEstimateSentAt(Instant.now());
        po.setStatus(PartyOrderStatus.ESTIMATE_SENT);

        po = partyOrderRepo.save(po);
        log.info("[PartyOrder] Estimate submitted by admin='{}' for partyOrderId={}, amount={}",
                adminName, po.getId(), req.estimatedAmount());
        return PartyOrderResponse.forAdmin(po);
    }

    @Override
    @Transactional
    public PartyOrderResponse updateStatus(Long orderId, PartyOrderStatusUpdateRequest req, String adminName) {
        PartyOrder po = requireOrder(orderId);
        PartyOrderStatus prev = po.getStatus();
        po.setStatus(req.status());
        po = partyOrderRepo.save(po);
        log.info("[PartyOrder] Admin='{}' changed partyOrderId={} status: {} → {}",
                adminName, orderId, prev, req.status());
        return PartyOrderResponse.forAdmin(po);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

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

    /** Trims, deduplicates, and maps raw strings to {@link PartyOrderMenuItem} entities. */
    private List<PartyOrderMenuItem> normalizeMenuItems(List<String> raw, PartyOrder parent) {
        if (raw == null) return List.of();
        return raw.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .map(name -> PartyOrderMenuItem.builder()
                        .partyOrder(parent)
                        .itemName(name)
                        .build())
                .collect(Collectors.toList());
    }
}
