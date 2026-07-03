package com.broandbro.qrapp.promotion.engine;

import java.time.LocalDateTime;

public record UserContext(
        Long id,
        int orderCount,
        LocalDateTime lastOrderAt  // null if no orders yet
) {}

