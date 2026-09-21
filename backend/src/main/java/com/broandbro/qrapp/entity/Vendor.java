package com.broandbro.qrapp.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;
@Entity
@Table(name = "vendor")
@Data
public class Vendor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "vendor_name", nullable = false)
    private String vendorName;
    @Column(name = "phone_number", nullable = false, unique = true)
    private String phoneNumber;
    @Column(name = "alternate_phone_number")
    private String alternatePhoneNumber;
    @Column(columnDefinition = "TEXT")
    private String address;
    @Column(name = "is_active")
    private Boolean isActive = true;
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at")
    private Instant updatedAt;
    @Version
    private Long version;
    @PrePersist
    public void prePersist() {
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
        if (this.isActive == null) this.isActive = true;
    }
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
