package com.broandbro.qrapp.service;

import com.broandbro.qrapp.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class LocationCodeService {
    private static final int MAX_CODE_LENGTH = 80;
    private final LocationRepository locationRepository;

    public String generate(String requestedCode, String locationName) {
        String source = requestedCode == null || requestedCode.isBlank() ? locationName : requestedCode;
        String base = slugify(source);
        if (base.isBlank()) base = "location";
        base = base.substring(0, Math.min(base.length(), MAX_CODE_LENGTH));

        String candidate = base;
        int suffix = 2;
        while (locationRepository.findByCode(candidate).isPresent()) {
            String suffixText = "-" + suffix++;
            int baseLength = Math.min(base.length(), MAX_CODE_LENGTH - suffixText.length());
            candidate = base.substring(0, baseLength) + suffixText;
        }
        return candidate;
    }

    private String slugify(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        return normalized;
    }
}
