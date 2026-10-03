package com.broandbro.qrapp.foodcourt.exception;

/**
 * Thrown when creating/activating a stall lease would overlap an existing
 * active lease on the same stall, or when a duplicate rent month is generated.
 * Maps to HTTP 409 Conflict.
 */
public class FoodCourtConflictException extends RuntimeException {
    public FoodCourtConflictException(String message) {
        super(message);
    }
}
