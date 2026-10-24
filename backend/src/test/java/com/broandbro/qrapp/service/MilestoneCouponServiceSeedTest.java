package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.MilestoneConfig;
import com.broandbro.qrapp.repository.MilestoneConfigRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.promotion.repository.PromotionRepository;
import com.broandbro.qrapp.repository.UserMilestoneRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Regression: default milestone configs must be fresh instances per seeding. A shared static list
 * kept the ids assigned by the first save, so a later Spring context merged stale rows and failed.
 */
class MilestoneCouponServiceSeedTest {

    @Test
    void eachSeedingStartsFromUnsavedConfigInstances() {
        AtomicLong ids = new AtomicLong(1);
        List<List<Long>> idsSeenBeforeSave = new ArrayList<>();

        MilestoneConfigRepository configRepo = mock(MilestoneConfigRepository.class);
        when(configRepo.count()).thenReturn(0L);
        when(configRepo.saveAll(anyList())).thenAnswer(invocation -> {
            List<MilestoneConfig> configs = invocation.getArgument(0);
            List<Long> before = new ArrayList<>();
            configs.forEach(c -> before.add(c.getId()));
            idsSeenBeforeSave.add(before);
            configs.forEach(c -> c.setId(ids.getAndIncrement()));
            return configs;
        });

        newService(configRepo).seedDefaults();
        newService(configRepo).seedDefaults();

        assertThat(idsSeenBeforeSave).hasSize(2);
        assertThat(idsSeenBeforeSave.get(0)).hasSize(5).containsOnlyNulls();
        assertThat(idsSeenBeforeSave.get(1)).as("second seeding must not reuse saved instances").hasSize(5).containsOnlyNulls();
    }

    @Test
    void seedingSkippedWhenConfigsAlreadyExist() {
        MilestoneConfigRepository configRepo = mock(MilestoneConfigRepository.class);
        when(configRepo.count()).thenReturn(3L);

        newService(configRepo).seedDefaults();

        org.mockito.Mockito.verify(configRepo, org.mockito.Mockito.never()).saveAll(anyList());
    }

    private MilestoneCouponService newService(MilestoneConfigRepository configRepo) {
        return new MilestoneCouponService(
                mock(OrderRepository.class),
                mock(PromotionRepository.class),
                mock(UserMilestoneRepository.class),
                configRepo);
    }
}
