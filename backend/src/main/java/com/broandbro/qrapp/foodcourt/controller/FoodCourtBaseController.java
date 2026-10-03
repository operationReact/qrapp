package com.broandbro.qrapp.foodcourt.controller;

import com.broandbro.qrapp.foodcourt.security.FoodCourtAccessService;
import org.springframework.security.core.Authentication;

import java.util.UUID;

/**
 * Base for food court REST controllers. Centralises resolving the opaque caller
 * id and enforcing per-food-court access server-side so controllers never trust
 * a food court id from the request without an authorization check.
 */
public abstract class FoodCourtBaseController {

    protected final FoodCourtAccessService accessService;

    protected FoodCourtBaseController(FoodCourtAccessService accessService) {
        this.accessService = accessService;
    }

    /** The opaque user id of the caller (the authentication principal name). */
    protected String actor(Authentication auth) {
        return accessService.currentUserId(auth);
    }

    /** Verifies the caller may act on the given food court; throws 403 otherwise. */
    protected void requireAccess(Authentication auth, UUID foodCourtId) {
        accessService.requireAccess(auth, foodCourtId);
    }
}
