package com.broandbro.qrapp.partnerfinance.engine;

import com.broandbro.qrapp.time.BusinessTime;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;

/** Business-timezone clock for finance rules; replaceable in tests. */
@Component
public class FinanceClock {
    private final Clock clock;

    @Autowired
    public FinanceClock() {
        this(Clock.system(BusinessTime.ZONE));
    }

    public FinanceClock(Clock clock) {
        this.clock = clock.withZone(BusinessTime.ZONE);
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    public Instant now() {
        return clock.instant();
    }
}