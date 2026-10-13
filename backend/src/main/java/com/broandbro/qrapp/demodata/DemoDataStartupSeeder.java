package com.broandbro.qrapp.demodata;

import com.broandbro.qrapp.analytics.scheduler.DailySalesAggregationScheduler;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Optional local/demo startup entry point for the synthetic partner fixture.
 *
 * <p>This class is intentionally separate from the fixture service. Removing or
 * commenting this class removes automatic startup seeding; the fixture remains
 * available only through its explicitly protected development endpoints.</p>
 */
@Component
@Profile({"dev", "local", "prod"})
@ConditionalOnProperty(name = "app.demo-seed.startup", havingValue = "true")
@RequiredArgsConstructor
public class DemoDataStartupSeeder {
    private static final Logger log = LoggerFactory.getLogger(DemoDataStartupSeeder.class);

    private final DemoDataService demoDataService;
    private final DailySalesAggregationScheduler dailySalesScheduler;

    @EventListener(ApplicationReadyEvent.class)
    public void seedOnStartup() {
        var result = demoDataService.setup();
        LocalDate today = BusinessTime.today();
        dailySalesScheduler.backfill(today.minusDays(89), today);
        log.info("Development demo fixture is ready: marker={}, location={}, ownedRecords={}",
                result.get("marker"), result.get("locationCode"), result.get("ownedRecords"));
    }
}
