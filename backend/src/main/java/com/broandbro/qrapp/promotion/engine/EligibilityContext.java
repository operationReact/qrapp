package com.broandbro.qrapp.promotion.engine;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record EligibilityContext(
        UserContext user,
        CartContext cart,
        LocalDateTime evaluatedAt
) {}

