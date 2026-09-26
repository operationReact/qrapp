package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.repository.LocationRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LocationCodeService {
    private static final int MAX_SLUG_LENGTH = 20;
    private static final Map<String, String> STATE_CODES = Map.ofEntries(
            Map.entry("Andhra Pradesh", "AP"), Map.entry("Arunachal Pradesh", "AR"),
            Map.entry("Assam", "AS"), Map.entry("Bihar", "BR"), Map.entry("Chhattisgarh", "CG"),
            Map.entry("Goa", "GA"), Map.entry("Gujarat", "GJ"), Map.entry("Haryana", "HR"),
            Map.entry("Himachal Pradesh", "HP"), Map.entry("Jharkhand", "JH"), Map.entry("Karnataka", "KA"),
            Map.entry("Kerala", "KL"), Map.entry("Madhya Pradesh", "MP"), Map.entry("Maharashtra", "MH"),
            Map.entry("Manipur", "MN"), Map.entry("Meghalaya", "ML"), Map.entry("Mizoram", "MZ"),
            Map.entry("Nagaland", "NL"), Map.entry("Odisha", "OD"), Map.entry("Punjab", "PB"),
            Map.entry("Rajasthan", "RJ"), Map.entry("Sikkim", "SK"), Map.entry("Tamil Nadu", "TN"),
            Map.entry("Telangana", "TG"), Map.entry("Tripura", "TR"), Map.entry("Uttar Pradesh", "UP"),
            Map.entry("Uttarakhand", "UK"), Map.entry("West Bengal", "WB"),
            Map.entry("Andaman and Nicobar Islands", "AN"), Map.entry("Chandigarh", "CH"),
            Map.entry("Dadra and Nagar Haveli and Daman and Diu", "DH"), Map.entry("Delhi", "DL"),
            Map.entry("Jammu and Kashmir", "JK"), Map.entry("Ladakh", "LA"),
            Map.entry("Lakshadweep", "LD"), Map.entry("Puducherry", "PY")
    );
    private final LocationRepository locationRepository;

    @Transactional
    public Location create(Location location) {
        String prefix = prefix(location.getName(), location.getStateUt());
        locationRepository.lockCodePrefix(prefix);
        int sequence = locationRepository.findMaxSequence(prefix) + 1;
        location.setCode(prefix + "-" + String.format("%03d", sequence));
        return locationRepository.save(location);
    }

    public String preview(String locationName, String stateUt) {
        return prefix(locationName, stateUt) + "-001";
    }

    private String prefix(String locationName, String stateUt) {
        String stateCode = STATE_CODES.get(stateUt == null ? "" : stateUt.trim());
        if (stateCode == null) {
            throw new IllegalArgumentException("Unsupported state or union territory");
        }
        return slugify(locationName) + "-" + stateCode;
    }

    private String slugify(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", "-")
                .replaceAll("^-|-$", "");
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("Location name must contain letters or digits");
        }
        return normalized.substring(0, Math.min(normalized.length(), MAX_SLUG_LENGTH))
                .replaceAll("-$", "");
    }
}
