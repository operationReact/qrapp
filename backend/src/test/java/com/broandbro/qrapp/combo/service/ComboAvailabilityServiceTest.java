package com.broandbro.qrapp.combo.service;

import com.broandbro.qrapp.combo.entity.Combo;
import com.broandbro.qrapp.combo.entity.ComboItem;
import com.broandbro.qrapp.combo.entity.ComboSchedule;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.enums.ComboAvailabilityStatus;
import com.broandbro.qrapp.enums.TimeSlot;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ComboAvailabilityService")
class ComboAvailabilityServiceTest {

    private final ComboAvailabilityService sut = new ComboAvailabilityService();

    private Combo activeCombo(TimeSlot slot) {
        Combo c = new Combo();
        c.setIsActive(true);
        c.setTimeSlot(slot);
        c.setItems(new java.util.ArrayList<>());
        c.setSchedules(new java.util.ArrayList<>());
        c.setSignatureProducts(new java.util.ArrayList<>());
        return c;
    }

    @Test
    @DisplayName("FULL_DAY combo is always AVAILABLE when active and items available")
    void full_day_combo_is_available() {
        Combo combo = activeCombo(TimeSlot.FULL_DAY);
        assertThat(sut.computeAvailability(combo, LocalDateTime.now()))
                .isEqualTo(ComboAvailabilityStatus.AVAILABLE);
    }

    @Test
    @DisplayName("Inactive combo returns UNAVAILABLE")
    void inactive_combo_is_unavailable() {
        Combo combo = activeCombo(TimeSlot.FULL_DAY);
        combo.setIsActive(false);
        assertThat(sut.computeAvailability(combo, LocalDateTime.now()))
                .isEqualTo(ComboAvailabilityStatus.UNAVAILABLE);
    }

    @Test
    @DisplayName("Combo with hidden item returns ITEMS_UNAVAILABLE")
    void combo_with_hidden_item_is_unavailable() {
        Combo combo = activeCombo(TimeSlot.FULL_DAY);
        MenuItem mi = new MenuItem();
        mi.setIsHidden(true);
        ComboItem item = new ComboItem();
        item.setMenuItem(mi);
        combo.getItems().add(item);

        assertThat(sut.computeAvailability(combo, LocalDateTime.now()))
                .isEqualTo(ComboAvailabilityStatus.ITEMS_UNAVAILABLE);
    }

    @Test
    @DisplayName("LUNCH combo within schedule window is AVAILABLE")
    void lunch_combo_within_schedule_is_available() {
        Combo combo = activeCombo(TimeSlot.LUNCH);

        // Monday schedule 12:00-14:00
        ComboSchedule schedule = new ComboSchedule();
        schedule.setDayOfWeek(1); // Monday
        schedule.setStartTime(LocalTime.of(12, 0));
        schedule.setEndTime(LocalTime.of(14, 0));
        schedule.setIsActive(true);
        combo.getSchedules().add(schedule);

        // Simulate Monday 12:30
        LocalDateTime monday1230 = LocalDateTime.of(2026, 5, 18, 12, 30); // 2026-05-18 is a Monday
        assertThat(sut.computeAvailability(combo, monday1230))
                .isEqualTo(ComboAvailabilityStatus.AVAILABLE);
    }

    @Test
    @DisplayName("LUNCH combo outside schedule window is SCHEDULE_INACTIVE")
    void lunch_combo_outside_schedule_is_inactive() {
        Combo combo = activeCombo(TimeSlot.LUNCH);

        ComboSchedule schedule = new ComboSchedule();
        schedule.setDayOfWeek(1);
        schedule.setStartTime(LocalTime.of(12, 0));
        schedule.setEndTime(LocalTime.of(14, 0));
        schedule.setIsActive(true);
        combo.getSchedules().add(schedule);

        // Monday 16:00 — outside window
        LocalDateTime monday1600 = LocalDateTime.of(2026, 5, 18, 16, 0);
        assertThat(sut.computeAvailability(combo, monday1600))
                .isEqualTo(ComboAvailabilityStatus.SCHEDULE_INACTIVE);
    }
}

