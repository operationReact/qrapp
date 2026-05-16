package com.broandbro.qrapp.exception;

public class MenuItemNotFoundException extends RuntimeException {
    public MenuItemNotFoundException(Long id) {
        super("Menu item not found with id: " + id);
    }
}

