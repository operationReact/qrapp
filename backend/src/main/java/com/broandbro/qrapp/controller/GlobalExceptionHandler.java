package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.combo.exception.ComboNotFoundException;
import com.broandbro.qrapp.combo.exception.ComboValidationException;
import com.broandbro.qrapp.signature.exception.InsufficientStockException;
import com.broandbro.qrapp.signature.exception.SignatureProductNotFoundException;
import com.broandbro.qrapp.exception.DuplicateTransactionException;
import com.broandbro.qrapp.exception.FileTooLargeException;
import com.broandbro.qrapp.exception.ImageNotFoundException;
import com.broandbro.qrapp.exception.ImageUploadException;
import com.broandbro.qrapp.exception.InsufficientBalanceException;
import com.broandbro.qrapp.exception.InvalidImageException;
import com.broandbro.qrapp.exception.InvalidPromptException;
import com.broandbro.qrapp.exception.InventoryNotConfiguredException;
import com.broandbro.qrapp.exception.InventoryOperationException;
import com.broandbro.qrapp.exception.MenuItemNotFoundException;
import com.broandbro.qrapp.exception.OpenAiImageGenerationException;
import com.broandbro.qrapp.exception.OrderValidationException;
import com.broandbro.qrapp.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ImageNotFoundException.class)
    public ResponseEntity<String> handleImageNotFound(ImageNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(InvalidImageException.class)
    public ResponseEntity<String> handleInvalidImage(InvalidImageException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(FileTooLargeException.class)
    public ResponseEntity<String> handleFileTooLarge(FileTooLargeException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(ex.getMessage());
    }

    @ExceptionHandler(InventoryOperationException.class)
    public ResponseEntity<String> handleInventoryOperation(InventoryOperationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(InventoryNotConfiguredException.class)
    public ResponseEntity<String> handleInventoryNotConfigured(InventoryNotConfiguredException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(MenuItemNotFoundException.class)
    public ResponseEntity<String> handleMenuItemNotFound(MenuItemNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(InsufficientBalanceException.class)
    public ResponseEntity<String> handleInsufficient(InsufficientBalanceException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(DuplicateTransactionException.class)
    public ResponseEntity<String> handleDuplicate(DuplicateTransactionException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }

    @ExceptionHandler(ComboNotFoundException.class)
    public ResponseEntity<String> handleComboNotFound(ComboNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(ComboValidationException.class)
    public ResponseEntity<String> handleComboValidation(ComboValidationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(SignatureProductNotFoundException.class)
    public ResponseEntity<String> handleSignatureProductNotFound(SignatureProductNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<String> handleInsufficientStock(InsufficientStockException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }

    @ExceptionHandler(OrderValidationException.class)
    public ResponseEntity<ErrorResponse> handleOrderValidation(OrderValidationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
            new ErrorResponse(ex.getErrorCode(), ex.getMessage())
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ex.getMessage());
    }

    @ExceptionHandler(OpenAiImageGenerationException.class)
    public ResponseEntity<String> handleOpenAiImageGeneration(OpenAiImageGenerationException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ex.getMessage());
    }

    @ExceptionHandler(ImageUploadException.class)
    public ResponseEntity<String> handleImageUpload(ImageUploadException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ex.getMessage());
    }

    @ExceptionHandler(InvalidPromptException.class)
    public ResponseEntity<String> handleInvalidPrompt(InvalidPromptException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<String> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message.isBlank() ? "Validation failed" : message);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleAny(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ex.getMessage());
    }
}

