package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "locations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Location {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false, length = 80)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "country", length = 80)
    private String country;

    @Column(name = "address_line_1", length = 255)
    private String addressLine1;

    @Column(name = "address_line_2", length = 255)
    private String addressLine2;

    @Column(length = 160)
    private String landmark;

    @Column(length = 120)
    private String city;

    @Column(length = 120)
    private String district;

    @Column(name = "state_ut", length = 120)
    private String stateUt;

    @Column(name = "pin_code", length = 6)
    private String pinCode;

    @Column(precision = 10, scale = 7)
    private java.math.BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private java.math.BigDecimal longitude;

    @Column(name = "location_photo_url", columnDefinition = "TEXT")
    private String locationPhotoUrl;

    @Column(name = "location_photo_key", columnDefinition = "TEXT")
    private String locationPhotoKey;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (active == null) active = true;
    }
}
