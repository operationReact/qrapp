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

    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (isAdmin == null) isAdmin = false;
        if (isSuperUser == null) isSuperUser = false;
    }
}
