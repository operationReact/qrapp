package com.broandbro.qrapp.config;

import com.broandbro.qrapp.exception.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Global exception handler for inventory-related exceptions.
 *
 * Provides consistent error responses across all inventory endpoints.
 */
@RestControllerAdvice
@Slf4j
public class GlobalInventoryExceptionHandler {

    @ExceptionHandler({AccessDeniedException.class,
            org.springframework.security.authorization.AuthorizationDeniedException.class})
    public ResponseEntity<?> handleAccessDenied(Exception ex, WebRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.FORBIDDEN.value());
        body.put("error", "Forbidden");
        body.put("message", ex.getMessage());
        body.put("path", request.getDescription(false).replace("uri=", ""));
        return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
    }

    /**
     * Handle InsufficientInventoryException (409 Conflict).
     */
    @ExceptionHandler(InsufficientInventoryException.class)
    public ResponseEntity<?> handleInsufficientInventory(
            InsufficientInventoryException ex,
            WebRequest request) {

        log.warn("Insufficient inventory: item={}, requested={}, available={}",
            ex.getMenuItemId(), ex.getRequestedQuantity(), ex.getAvailableQuantity());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.CONFLICT.value());
        body.put("error", "Insufficient Inventory");
        body.put("message", ex.getMessage());
        body.put("menuItemId", ex.getMenuItemId());
        body.put("requested", ex.getRequestedQuantity());
        body.put("available", ex.getAvailableQuantity());
        body.put("path", request.getDescription(false).replace("uri=", ""));

        return new ResponseEntity<>(body, HttpStatus.CONFLICT);
    }

    /**
     * Handle InventoryNotConfiguredException (404 Not Found or 400 Bad Request).
     */
    @ExceptionHandler(InventoryNotConfiguredException.class)
    public ResponseEntity<?> handleInventoryNotConfigured(
            InventoryNotConfiguredException ex,
            WebRequest request) {

        log.warn("Inventory not configured: {}", ex.getMessage());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Inventory Not Configured");
        body.put("message", ex.getMessage());
        body.put("path", request.getDescription(false).replace("uri=", ""));

        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handle InventoryOperationException (400 Bad Request).
     */
    @ExceptionHandler(InventoryOperationException.class)
    public ResponseEntity<?> handleInventoryOperation(
            InventoryOperationException ex,
            WebRequest request) {

        log.error("Inventory operation error: {}", ex.getMessage(), ex);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Inventory Operation Failed");
        body.put("message", ex.getMessage());
        body.put("path", request.getDescription(false).replace("uri=", ""));

        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handle general IllegalArgumentException (400 Bad Request).
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(
            IllegalArgumentException ex,
            WebRequest request) {

        log.warn("Invalid argument: {}", ex.getMessage());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Invalid Argument");
        body.put("message", ex.getMessage());
        body.put("path", request.getDescription(false).replace("uri=", ""));

        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handle IllegalStateException (503 Service Unavailable).
     * Covers: Razorpay not configured, payment gateway unavailable, etc.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> handleIllegalState(
            IllegalStateException ex,
            WebRequest request) {

        log.error("Service unavailable: {}", ex.getMessage(), ex);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.SERVICE_UNAVAILABLE.value());
        body.put("error", "Service Unavailable");
        body.put("message", ex.getMessage());
        body.put("path", request.getDescription(false).replace("uri=", ""));

        return new ResponseEntity<>(body, HttpStatus.SERVICE_UNAVAILABLE);
    }

    /**
     * Handle general exceptions (500 Internal Server Error).
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGlobalException(
            Exception ex,
            WebRequest request) {

        log.error("Unexpected error [{}]: {}", ex.getClass().getSimpleName(), ex.getMessage(), ex);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("error", "Internal Server Error");
        // Expose the real cause so the caller can diagnose without server log access
        body.put("message", ex.getClass().getSimpleName() + ": " + ex.getMessage());
        body.put("path", request.getDescription(false).replace("uri=", ""));

        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
