package com.broandbro.qrapp.promotion.engine.scope;

public record ScopeResult(boolean matches, String reason) {
    public static ScopeResult match() {
        return new ScopeResult(true, null);
    }

    public static ScopeResult noMatch(String reason) {
        return new ScopeResult(false, reason);
    }
}

