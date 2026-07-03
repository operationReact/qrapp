package com.broandbro.qrapp.promotion.engine.stacking;

public record StackingResult(boolean permitted, String reason) {
    public static StackingResult allowed() {
        return new StackingResult(true, null);
    }

    public static StackingResult blocked(String reason) {
        return new StackingResult(false, reason);
    }
}

