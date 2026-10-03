package com.broandbro.qrapp.foodcourt.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Translates food court domain exceptions into HTTP responses. Scoped to the
 * {@code foodcourt} package so it never alters error handling for the ordering
 * domain's {@code GlobalExceptionHandler}.
 */
@Slf4j
@RestControllerAdvice(basePackages = "com.broandbro.qrapp.foodcourt")
public class FoodCourtExceptionHandler {

    @ExceptionHandler(FoodCourtNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(FoodCourtNotFoundException ex) {
        return body(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(FoodCourtValidationException.class)
    public ResponseEntity<Map<String, String>> handleValidation(FoodCourtValidationException ex) {
        return body(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(FoodCourtConflictException.class)
    public ResponseEntity<Map<String, String>> handleConflict(FoodCourtConflictException ex) {
        return body(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(FoodCourtAccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(FoodCourtAccessDeniedException ex) {
        return body(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    private ResponseEntity<Map<String, String>> body(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message == null ? status.getReasonPhrase() : message));
    }
}
