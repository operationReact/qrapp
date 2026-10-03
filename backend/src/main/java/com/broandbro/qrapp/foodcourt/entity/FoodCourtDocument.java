package com.broandbro.qrapp.foodcourt.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

/**
 * A document reference attached to any food court entity. Stored purely as
 * opaque metadata (a URL and/or storage key) so no ordering-domain document
 * entity or binary coupling is introduced.
 */
@Entity
@Table(name = "fc_documents")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class FoodCourtDocument extends FoodCourtBaseEntity {

    @Column(name = "food_court_id", nullable = false)
    private UUID foodCourtId;

    /** The kind of entity this document belongs to (e.g. STALL_LEASE, DEPOSIT). */
    @Column(name = "entity_type", nullable = false, length = 60)
    private String entityType;

    @Column(name = "entity_id")
    private UUID entityId;

    @Column(name = "label", length = 180)
    private String label;

    @Column(name = "doc_url", columnDefinition = "TEXT")
    private String docUrl;

    @Column(name = "doc_key", columnDefinition = "TEXT")
    private String docKey;

    /** Opaque user id who attached the document. */
    @Column(name = "uploaded_by", length = 100)
    private String uploadedBy;
}
