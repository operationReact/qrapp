package com.broandbro.qrapp.combo.repository;

import com.broandbro.qrapp.combo.entity.Combo;
import com.broandbro.qrapp.enums.ComboStatus;
import com.broandbro.qrapp.enums.ComboType;
import com.broandbro.qrapp.enums.TimeSlot;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * JPA Specifications for dynamic combo filtering.
 */
public final class ComboSpecification {

    private ComboSpecification() {}

    public static Specification<Combo> buildFilter(
            String search, Long categoryId, Boolean isActive,
            Boolean isFeatured, Boolean isPreorder, TimeSlot timeSlot) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Soft-delete guard
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("comboName")), pattern),
                        cb.like(cb.lower(root.get("shortName")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern)
                ));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (isActive != null) {
                predicates.add(cb.equal(root.get("isActive"), isActive));
            }
            if (isFeatured != null) {
                predicates.add(cb.equal(root.get("isFeatured"), isFeatured));
            }
            if (isPreorder != null) {
                predicates.add(cb.equal(root.get("isPreorderEligible"), isPreorder));
            }
            if (timeSlot != null) {
                predicates.add(cb.equal(root.get("timeSlot"), timeSlot));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

