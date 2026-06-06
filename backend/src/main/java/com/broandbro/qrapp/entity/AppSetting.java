package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;

@Entity
@Table(name = "app_settings")
@Data
public class AppSetting {

    @Id
    @Column(name = "key", length = 128)
    private String key;

    @Column(name = "value", nullable = false, length = 1024)
    private String value;

    @Column(name = "description", length = 512)
    private String description;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() { this.updatedAt = Instant.now(); }
}

