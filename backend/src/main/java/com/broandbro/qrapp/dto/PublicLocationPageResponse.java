package com.broandbro.qrapp.dto;

import java.util.List;

public record PublicLocationPageResponse(
        List<LocationResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext) {
}
