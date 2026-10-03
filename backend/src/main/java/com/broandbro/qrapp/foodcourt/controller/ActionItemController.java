package com.broandbro.qrapp.foodcourt.controller;

import com.broandbro.qrapp.foodcourt.dto.ActionItemRequest;
import com.broandbro.qrapp.foodcourt.dto.ActionItemResponse;
import com.broandbro.qrapp.foodcourt.enums.ActionItemStatus;
import com.broandbro.qrapp.foodcourt.security.FoodCourtAccessService;
import com.broandbro.qrapp.foodcourt.service.ActionItemService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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

import java.util.List;
import java.util.UUID;

/** Operational action item CRUD under a food court. */
@RestController
@RequestMapping("/api/v1/food-courts/{foodCourtId}/action-items")
@PreAuthorize("hasAnyRole('ADMIN','SUPERUSER','SUPER_ADMIN','MANAGER','FOODCOURT_SUPER_ADMIN','FOODCOURT_ADMIN','FOODCOURT_MANAGER','FOODCOURT_OPERATIONS','FOODCOURT_VIEWER')")
@Tag(name = "Food Court Action Items", description = "Operational to-dos")
public class ActionItemController extends FoodCourtBaseController {

    private final ActionItemService actionItemService;

    public ActionItemController(FoodCourtAccessService accessService, ActionItemService actionItemService) {
        super(accessService);
        this.actionItemService = actionItemService;
    }

    @PostMapping
    public ResponseEntity<ActionItemResponse> create(@PathVariable UUID foodCourtId,
                                                     @Valid @RequestBody ActionItemRequest request,
                                                     Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(actionItemService.create(foodCourtId, request, actor(auth)));
    }

    @GetMapping
    public ResponseEntity<List<ActionItemResponse>> list(@PathVariable UUID foodCourtId,
                                                         @RequestParam(required = false) ActionItemStatus status,
                                                         Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(actionItemService.list(foodCourtId, status));
    }

    @GetMapping("/{itemId}")
    public ResponseEntity<ActionItemResponse> getById(@PathVariable UUID foodCourtId, @PathVariable UUID itemId,
                                                      Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(actionItemService.getById(foodCourtId, itemId));
    }

    @PutMapping("/{itemId}")
    public ResponseEntity<ActionItemResponse> update(@PathVariable UUID foodCourtId, @PathVariable UUID itemId,
                                                     @Valid @RequestBody ActionItemRequest request,
                                                     Authentication auth) {
        requireAccess(auth, foodCourtId);
        return ResponseEntity.ok(actionItemService.update(foodCourtId, itemId, request, actor(auth)));
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> delete(@PathVariable UUID foodCourtId, @PathVariable UUID itemId,
                                       Authentication auth) {
        requireAccess(auth, foodCourtId);
        actionItemService.delete(foodCourtId, itemId, actor(auth));
        return ResponseEntity.noContent().build();
    }
}
