package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "category", uniqueConstraints = {
        @UniqueConstraint(name = "uq_category_location_name", columnNames = {"location_id", "name"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "location_id", nullable = false)
    @JsonIgnore
    private Location location;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    /** Optional premium food-photography image. Falls back to the client-side icon resolver when null. */
    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    /** Storage key for {@link #imageUrl}, used for clean deletion/replacement. */
    @Column(name = "image_key", columnDefinition = "TEXT")
    private String imageKey;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    /** TRUE when {@link #imageUrl} was produced via the admin-triggered AI generation flow. */
    @Column(name = "ai_generated_image", nullable = false)
    private Boolean aiGeneratedImage = false;
}
