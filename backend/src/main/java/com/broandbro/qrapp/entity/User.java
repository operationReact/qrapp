package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String phone;

    @Column(nullable = false)
    private String password; // BCrypt encoded

    private String name;

    private LocalDate dateOfBirth;

    private LocalDate specialDate;

    @Column(length = 120)
    private String specialDateDescription;

    @Column(name = "special_day_type", length = 64)
    private String specialDayType;

    @Column(name = "special_day_custom_label", length = 120)
    private String specialDayCustomLabel;

    @Column(unique = true)
    private String token; // simple bearer token

    @Column(nullable = false)
    private Boolean isAdmin = false; // Admin flag for role-based access control

    @Column(nullable = false)
    private Boolean isSuperUser = false; // Super user flag - only super users can create coupons

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private UserRole role = UserRole.CUSTOMER;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "default_location_id")
    private Location defaultLocation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_company_id")
    private CustomerCompany customerCompany;

    @Column(name = "terms_accepted", nullable = false)
    private Boolean termsAccepted = false;

    @Column(name = "terms_accepted_at")
    private Instant termsAcceptedAt;

    @Column(name = "terms_version", length = 80)
    private String termsVersion;

    @Column(name = "privacy_policy_version", length = 80)
    private String privacyPolicyVersion;

    private Instant createdAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "must_change_password", nullable = false)
    @Builder.Default
    private Boolean mustChangePassword = false;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (isAdmin == null) isAdmin = false;
        if (isSuperUser == null) isSuperUser = false;
        if (termsAccepted == null) termsAccepted = false;
        if (active == null) active = true;
        if (mustChangePassword == null) mustChangePassword = false;
        if (role == null) role = isSuperUser ? UserRole.SUPER_ADMIN
                : (isAdmin ? UserRole.ADMIN : UserRole.CUSTOMER);
    }
}
