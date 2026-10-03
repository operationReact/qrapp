package com.broandbro.qrapp.foodcourt.service;

import com.broandbro.qrapp.foodcourt.dto.ActionItemRequest;
import com.broandbro.qrapp.foodcourt.dto.ActionItemResponse;
import com.broandbro.qrapp.foodcourt.entity.ActionItem;
import com.broandbro.qrapp.foodcourt.enums.ActionItemPriority;
import com.broandbro.qrapp.foodcourt.enums.ActionItemStatus;
import com.broandbro.qrapp.foodcourt.enums.AuditAction;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtNotFoundException;
import com.broandbro.qrapp.foodcourt.audit.FoodCourtAuditService;
import com.broandbro.qrapp.foodcourt.repository.ActionItemRepository;
import com.broandbro.qrapp.foodcourt.repository.FoodCourtRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Operational action item CRUD scoped to a food court. */
@Service
@RequiredArgsConstructor
public class ActionItemService {

    private final ActionItemRepository actionItemRepository;
    private final FoodCourtRepository foodCourtRepository;
    private final FoodCourtAuditService auditService;

    @Transactional
    public ActionItemResponse create(UUID foodCourtId, ActionItemRequest req, String actorUserId) {
        requireFoodCourt(foodCourtId);
        ActionItemStatus status = req.status() == null ? ActionItemStatus.OPEN : req.status();
        ActionItem item = ActionItem.builder()
                .foodCourtId(foodCourtId)
                .title(req.title().trim())
                .description(req.description())
                .status(status)
                .priority(req.priority() == null ? ActionItemPriority.MEDIUM : req.priority())
                .dueDate(req.dueDate())
                .assignedTo(req.assignedTo())
                .completedAt(status == ActionItemStatus.COMPLETED ? Instant.now() : null)
                .createdBy(actorUserId)
                .updatedBy(actorUserId)
                .build();
        item = actionItemRepository.save(item);
        auditService.record(foodCourtId, AuditAction.CREATE, "ACTION_ITEM", item.getId(), actorUserId,
                "Created action item " + item.getTitle());
        return toResponse(item);
    }

    @Transactional
    public ActionItemResponse update(UUID foodCourtId, UUID itemId, ActionItemRequest req, String actorUserId) {
        ActionItem item = requireItem(foodCourtId, itemId);
        item.setTitle(req.title().trim());
        item.setDescription(req.description());
        if (req.priority() != null) {
            item.setPriority(req.priority());
        }
        item.setDueDate(req.dueDate());
        item.setAssignedTo(req.assignedTo());
        if (req.status() != null && req.status() != item.getStatus()) {
            item.setStatus(req.status());
            item.setCompletedAt(req.status() == ActionItemStatus.COMPLETED ? Instant.now() : null);
        }
        item.setUpdatedBy(actorUserId);
        item = actionItemRepository.save(item);
        auditService.record(foodCourtId, AuditAction.UPDATE, "ACTION_ITEM", item.getId(), actorUserId,
                "Updated action item " + item.getTitle());
        return toResponse(item);
    }

    @Transactional
    public void delete(UUID foodCourtId, UUID itemId, String actorUserId) {
        ActionItem item = requireItem(foodCourtId, itemId);
        item.setDeletedAt(Instant.now());
        item.setUpdatedBy(actorUserId);
        actionItemRepository.save(item);
        auditService.record(foodCourtId, AuditAction.DELETE, "ACTION_ITEM", item.getId(), actorUserId,
                "Deleted action item " + item.getTitle());
    }

    @Transactional(readOnly = true)
    public List<ActionItemResponse> list(UUID foodCourtId, ActionItemStatus status) {
        requireFoodCourt(foodCourtId);
        return actionItemRepository.findByFoodCourtAndStatus(foodCourtId, status).stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ActionItemResponse getById(UUID foodCourtId, UUID itemId) {
        return toResponse(requireItem(foodCourtId, itemId));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    ActionItemResponse toResponse(ActionItem a) {
        return new ActionItemResponse(
                a.getId(), a.getFoodCourtId(), a.getTitle(), a.getDescription(), a.getStatus(),
                a.getPriority(), a.getDueDate(), a.getAssignedTo(), a.getCompletedAt(), a.getCreatedAt());
    }

    private void requireFoodCourt(UUID foodCourtId) {
        if (foodCourtRepository.findActiveById(foodCourtId).isEmpty()) {
            throw new FoodCourtNotFoundException("food_court_not_found: " + foodCourtId);
        }
    }

    private ActionItem requireItem(UUID foodCourtId, UUID itemId) {
        ActionItem item = actionItemRepository.findActiveById(itemId)
                .orElseThrow(() -> new FoodCourtNotFoundException("action_item_not_found: " + itemId));
        if (!item.getFoodCourtId().equals(foodCourtId)) {
            throw new FoodCourtNotFoundException("action_item_not_found_in_food_court: " + itemId);
        }
        return item;
    }
}
