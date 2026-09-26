package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.repository.LocationRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class LocationCodeService {
    private static final Set<String> FILLER_WORDS = Set.of("THE", "AND", "OF", "AT", "IN");
    private static final Set<String> LEGAL_SUFFIXES = Set.of("LTD", "LIMITED", "LLP", "INC", "CORP", "CORPORATION", "PVT", "PRIVATE");
    private static final Map<String, String> CITY_CODES = Map.of(
            "HYDERABAD", "HYD", "BENGALURU", "BLR", "BANGALORE", "BLR",
            "MUMBAI", "MUM", "DELHI", "DEL", "CHENNAI", "CHE", "PUNE", "PUN"
    );
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
        return create(location, null);
    }

    @Transactional
    public Location create(Location location, String requestedCode) {
        String normalizedRequestedCode = normalizeRequestedCode(requestedCode);
        String prefix = prefix(location.getName(), location.getCity());
        if (normalizedRequestedCode != null) {
            locationRepository.lockCodePrefix(normalizedRequestedCode);
            if (locationRepository.existsByCode(normalizedRequestedCode)) {
                throw new IllegalArgumentException("Location code already exists. Please use a different code.");
            }
            location.setCode(normalizedRequestedCode);
            return locationRepository.save(location);
        }
        locationRepository.lockCodePrefix(prefix);
        int sequence = locationRepository.findMaxSequence(prefix) + 1;
        location.setCode(prefix + "-" + String.format("%03d", sequence));
        return locationRepository.save(location);
    }

    public String preview(String locationName, String city) {
        return prefix(locationName, city) + "-001";
    }

    private String prefix(String locationName, String city) {
        return abbreviation(locationName) + "-" + cityCode(city);
    }

    private String abbreviation(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", " ")
                .trim();
        List<String> words = Stream.of(normalized.split("\\s+"))
                .filter(word -> !word.isBlank() && !FILLER_WORDS.contains(word))
                .filter(word -> !LEGAL_SUFFIXES.contains(word))
                .toList();
        if (words.isEmpty()) {
            throw new IllegalArgumentException("Location name must contain letters or digits");
        }
        return words.get(0).substring(0, Math.min(words.size() == 1 ? 3 : 5, words.get(0).length()));
    }

    private String cityCode(String city) {
        String normalized = Normalizer.normalize(city == null ? "" : city, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]", "");
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("City is required to generate a location code");
        }
        return CITY_CODES.getOrDefault(normalized, normalized.substring(0, Math.min(3, normalized.length())));
    }

    private String normalizeRequestedCode(String requestedCode) {
        if (requestedCode == null || requestedCode.isBlank()) return null;
        String normalized = requestedCode.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z0-9]+(?:-[A-Z0-9]+){2}")) {
            throw new IllegalArgumentException("Location code must use NAME-CITY-SEQUENCE format");
        }
        return normalized;
    }
}
