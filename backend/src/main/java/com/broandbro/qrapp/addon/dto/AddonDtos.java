package com.broandbro.qrapp.addon.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTOs for add-on option groups.
 */
public class AddonDtos {

    @Data
    public static class OptionRequest {
        @NotBlank
        @Size(max = 120)
        private String name;

        @NotNull
        @DecimalMin("0.00")
        private BigDecimal priceDelta = BigDecimal.ZERO;

        private Boolean active = true;

        private Integer displayOrder = 0;
    }

    /**
     * Create or replace a group. Sending {@code options} replaces the group's option list.
     */
    @Data
    public static class GroupRequest {
        @NotBlank
        @Size(max = 120)
        private String name;

        @NotNull
        @Min(0)
        private Integer minSelect = 0;

        @NotNull
        @Min(1)
        @Max(50)
        private Integer maxSelect = 1;

        private Boolean active = true;

        private Integer displayOrder = 0;

        @Valid
        private List<OptionRequest> options;
    }

    @Data
    public static class AttachRequest {
        @NotNull
        private Long addonGroupId;

        private Integer displayOrder = 0;
    }

    @Data
    @Builder
    public static class OptionResponse {
        private Long id;
        private String name;
        private BigDecimal priceDelta;
        private Boolean active;
        private Integer displayOrder;
    }

    @Data
    @Builder
    public static class GroupResponse {
        private Long id;
        private String name;
        private Integer minSelect;
        private Integer maxSelect;
        private Boolean active;
        private Integer displayOrder;
        private List<OptionResponse> options;
    }

    @Data
    @Builder
    public static class ItemAddonGroupResponse {
        private Long id;
        private String name;
        private Integer minSelect;
        private Integer maxSelect;
        private Integer displayOrder;
        private List<OptionResponse> options;
    }
}
