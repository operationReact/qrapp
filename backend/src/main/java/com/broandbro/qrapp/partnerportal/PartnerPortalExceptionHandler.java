package com.broandbro.qrapp.partnerportal;

import com.broandbro.qrapp.dto.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Keeps authorization and validation failures of partner reports/notifications from becoming 500s. */
@RestControllerAdvice(basePackages = {"com.broandbro.qrapp.partnerreports", "com.broandbro.qrapp.partnernotification"})
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PartnerPortalExceptionHandler {

    @ExceptionHandler(PartnerPortalException.class)
    public ResponseEntity<ErrorResponse> handlePortal(PartnerPortalException ex) {
        return ResponseEntity.status(ex.getStatus()).body(new ErrorResponse(ex.getCode(), ex.getCode()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse("access_denied", "access_denied"));
    }

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorResponse> handleBadRequest(Exception ex) {
        return ResponseEntity.badRequest().body(new ErrorResponse("invalid_request", "invalid_request"));
    }
}
