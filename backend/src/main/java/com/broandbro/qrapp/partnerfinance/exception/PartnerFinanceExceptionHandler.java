package com.broandbro.qrapp.partnerfinance.exception;

import com.broandbro.qrapp.dto.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Scoped to the partner finance package so the generic handler never turns an authorization or
 * validation failure into a 500 for these endpoints.
 */
@RestControllerAdvice(basePackages = "com.broandbro.qrapp.partnerfinance")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PartnerFinanceExceptionHandler {

    @ExceptionHandler(PartnerFinanceException.class)
    public ResponseEntity<ErrorResponse> handleFinance(PartnerFinanceException ex) {
        return ResponseEntity.status(ex.getStatus()).body(new ErrorResponse(ex.getCode(), ex.getCode()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse("access_denied", "access_denied"));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorResponse> handleBadRequest(Exception ex) {
        return ResponseEntity.badRequest().body(new ErrorResponse("invalid_request", "invalid_request"));
    }

    @ExceptionHandler({OptimisticLockingFailureException.class, PessimisticLockingFailureException.class,
            DataIntegrityViolationException.class})
    public ResponseEntity<ErrorResponse> handleConflict(Exception ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("concurrent_modification", "concurrent_modification"));
    }
}