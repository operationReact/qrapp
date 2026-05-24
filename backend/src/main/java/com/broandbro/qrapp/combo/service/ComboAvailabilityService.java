package com.broandbro.qrapp.combo.service;

import com.broandbro.qrapp.combo.entity.Combo;
import com.broandbro.qrapp.combo.entity.ComboSchedule;
import com.broandbro.qrapp.enums.ComboAvailabilityStatus;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Determines real-time availability of a combo based on:
 * 1. Active flag
 * 2. Schedule windows
 * 3. Item availability
 */
@Service
public class ComboAvailabilityService {

    /**
     * Computes availability at a given point in time.
     */
    public ComboAvailabilityStatus computeAvailability(Combo combo, LocalDateTime now) {
        if (!Boolean.TRUE.equals(combo.getIsActive()) || combo.isDeleted()) {
            return ComboAvailabilityStatus.UNAVAILABLE;
        }

        // Check if any combo item is hidden / unavailable
        boolean anyItemUnavailable = combo.getItems().stream()
                .anyMatch(item -> Boolean.TRUE.equals(item.getMenuItem().getIsHidden()));
        if (anyItemUnavailable) {
            return ComboAvailabilityStatus.ITEMS_UNAVAILABLE;
        }

        // FULL_DAY combos skip schedule check
        if (combo.getTimeSlot() == com.broandbro.qrapp.enums.TimeSlot.FULL_DAY) {
            return ComboAvailabilityStatus.AVAILABLE;
        }

        // Schedule check
        int isoDow = now.getDayOfWeek().getValue(); // 1=Mon, 7=Sun
        LocalTime time = now.toLocalTime();

        boolean withinSchedule = combo.getSchedules().stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .filter(s -> s.getDayOfWeek() == isoDow)
                .anyMatch(s -> !time.isBefore(s.getStartTime()) && !time.isAfter(s.getEndTime()));

        return withinSchedule ? ComboAvailabilityStatus.AVAILABLE : ComboAvailabilityStatus.SCHEDULE_INACTIVE;
    }

    /** Convenience — uses current time. */
    public ComboAvailabilityStatus computeAvailability(Combo combo) {
        return computeAvailability(combo, LocalDateTime.now());
    }
}

