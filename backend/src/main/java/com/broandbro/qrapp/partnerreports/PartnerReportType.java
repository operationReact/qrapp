package com.broandbro.qrapp.partnerreports;

import com.broandbro.qrapp.partnerportal.PartnerPortalException;

import java.util.Arrays;

public enum PartnerReportType {
    SALES("sales", "Sales and Orders", "Gross sales, order volume, daily trend and order status mix.", true, true),
    LOCATIONS("locations", "Location Performance", "Sales, orders and growth for each authorized location.", true, true),
    MENU("menu", "Menu and Vendor Performance", "Vendor, category and item level revenue and units.", true, true),
    ENGAGEMENT("engagement", "Employee Engagement",
            "Aggregate employee ordering activity; no individual employee data is included.", true, true),
    FINANCE("finance", "Finance and Settlements",
            "Settlement snapshots for the period. Values are read as approved or paid; nothing is recalculated.",
            false, true),
    FEEDBACK("feedback", "Feedback and Complaints",
            "Feedback and complaint tracking is not available because no feedback source exists yet.", true, false);

    private final String slug;
    private final String title;
    private final String description;
    private final boolean locationScoped;
    private final boolean available;

    PartnerReportType(String slug, String title, String description, boolean locationScoped, boolean available) {
        this.slug = slug;
        this.title = title;
        this.description = description;
        this.locationScoped = locationScoped;
        this.available = available;
    }

    public String slug() {
        return slug;
    }

    public String title() {
        return title;
    }

    public String description() {
        return description;
    }

    public boolean locationScoped() {
        return locationScoped;
    }

    public boolean available() {
        return available;
    }

    public static PartnerReportType fromSlug(String value) {
        return Arrays.stream(values()).filter(type -> type.slug.equalsIgnoreCase(value == null ? "" : value.trim()))
                .findFirst().orElseThrow(() -> PartnerPortalException.notFound("report_type_not_found"));
    }
}