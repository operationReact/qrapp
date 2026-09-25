package com.broandbro.qrapp.service;

import java.util.Set;

final class SpecialDayTypes {
    private static final Set<String> ALLOWED = Set.of(
            "Birthday", "Anniversary", "Marriage Anniversary", "Engagement Day",
            "Proposal Day", "First Date", "First Meeting", "Relationship Start Date",
            "Partner's Birthday", "Child's Birthday", "Mother's Birthday",
            "Father's Birthday", "Sibling's Birthday", "Parents' Anniversary",
            "Friendship Anniversary", "Graduation Day", "New Job", "Career Milestone",
            "Business Anniversary", "Housewarming", "New Home Date", "New Car Date",
            "Travel Anniversary", "Family Milestone", "Festival/Celebration",
            "Religious/Spiritual Occasion", "Remembrance Day", "Special Memory",
            "Personal Milestone", "Other");

    private SpecialDayTypes() {
    }

    static String typeOrNull(String type) {
        if (type == null || type.isBlank()) return null;
        if (!ALLOWED.contains(type)) throw new IllegalArgumentException("invalid_special_day_type");
        return type;
    }

    static String customLabelOrNull(String type, String label) {
        String custom = label == null ? null : label.trim();
        if ("Other".equals(type)) return custom == null || custom.isEmpty() ? null : custom;
        return null;
    }
}
