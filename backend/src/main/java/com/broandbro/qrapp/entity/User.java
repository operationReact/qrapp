package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

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

    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (isAdmin == null) isAdmin = false;
        if (isSuperUser == null) isSuperUser = false;
        if (role == null) role = isSuperUser ? UserRole.SUPER_ADMIN
                : (isAdmin ? UserRole.ADMIN : UserRole.CUSTOMER);
    }
}
