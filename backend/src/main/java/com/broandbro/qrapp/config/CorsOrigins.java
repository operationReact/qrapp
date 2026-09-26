package com.broandbro.qrapp.config;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

final class CorsOrigins {

    private static final List<String> SAFE_FALLBACKS = List.of(
            "http://localhost:5173",
            "https://develop.broandbro.in",
            "https://broandbro.in",
            "https://www.broandbro.in"
    );

    private CorsOrigins() {
    }

    static List<String> resolve(String configuredOrigins) {
        String origins = configuredOrigins == null ? "" : configuredOrigins.trim();
        List<String> originList = Arrays.stream(origins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toList());

        if (originList.stream().anyMatch("*"::equals)) {
            return SAFE_FALLBACKS;
        }
        return originList.isEmpty() ? List.of("http://localhost:5173") : originList;
    }
}
