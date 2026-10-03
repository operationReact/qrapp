package com.broandbro.qrapp.foodcourt.exception;

/** Thrown when a requested food court entity does not exist (or is soft-deleted). */
public class FoodCourtNotFoundException extends RuntimeException {
    public FoodCourtNotFoundException(String message) {
        super(message);
    }
}
