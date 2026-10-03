package com.broandbro.qrapp.foodcourt.exception;

/** Thrown for invalid food court operations (bad input, illegal state transitions). */
public class FoodCourtValidationException extends RuntimeException {
    public FoodCourtValidationException(String message) {
        super(message);
    }
}
