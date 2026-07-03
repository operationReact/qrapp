package com.broandbro.qrapp.enums;

public enum SignatureInventoryOperation {
    STOCK_IN,       // Purchase / restocking
    STOCK_OUT,      // Manual deduction
    ADJUSTMENT,     // Manual correction / shrinkage
    SALE,           // Deducted on order completion
    RETURN,         // Customer return
    DAMAGED         // Write-off due to damage / expiry
}

