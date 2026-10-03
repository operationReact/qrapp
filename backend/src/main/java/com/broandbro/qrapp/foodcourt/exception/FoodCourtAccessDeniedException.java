package com.broandbro.qrapp.foodcourt.exception;

/** Thrown when the caller lacks access to the targeted food court. Maps to HTTP 403. */
public class FoodCourtAccessDeniedException extends RuntimeException {
    public FoodCourtAccessDeniedException(String message) {
        super(message);
    }
}
