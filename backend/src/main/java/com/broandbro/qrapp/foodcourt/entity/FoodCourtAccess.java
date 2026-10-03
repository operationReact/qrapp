package com.broandbro.qrapp.foodcourt.entity;

import com.broandbro.qrapp.foodcourt.enums.FoodCourtAccessStatus;
import com.broandbro.qrapp.foodcourt.enums.FoodCourtRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

/**
 * A per-food-court access grant mapping an opaque user id to a
 * {@link FoodCourtRole}. Drives server-side food court scoping independently of
 * platform-wide roles. Unique on (food_court_id, user_id).
 */
@Entity
@Table(name = "fc_access")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class FoodCourtAccess extends FoodCourtBaseEntity {

    @Column(name = "food_court_id", nullable = false)
    private UUID foodCourtId;

    /** Opaque platform user id (e.g. the authentication principal name). */
    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "fc_role", nullable = false, length = 20)
    private FoodCourtRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private FoodCourtAccessStatus status;
}
