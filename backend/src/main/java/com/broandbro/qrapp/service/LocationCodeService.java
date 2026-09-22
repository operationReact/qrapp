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
        boolean explicit = requestedCode != null && !requestedCode.isBlank();
        String source = explicit ? requestedCode : locationName;
        String base = slugify(source);
        if (base.isBlank()) base = "LOCATION";
        if (!base.startsWith("LOC-")) base = "LOC-" + base;
        base = base.toUpperCase(Locale.ROOT);

        int suffix = 1;
        if (base.matches("LOC-.+-\\d{3}")) {
            suffix = Integer.parseInt(base.substring(base.length() - 3));
            base = base.substring(0, base.length() - 4);
        }
        String candidate = withSequence(base, suffix);
        while (locationRepository.findByCode(candidate).isPresent()) {
            candidate = withSequence(base, ++suffix);
        }
        return candidate;
    }

    private String withSequence(String base, int sequence) {
        String suffix = String.format("-%03d", sequence);
        int baseLength = Math.min(base.length(), MAX_CODE_LENGTH - suffix.length());
        return base.substring(0, baseLength) + suffix;
    }

    private String slugify(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", "-")
                .replaceAll("^-|-$", "");
        return normalized;
    }
}
