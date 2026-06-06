package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.AppSetting;
import com.broandbro.qrapp.repository.AppSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppSettingService {

    private static final String KEY_PAY_AT_STALL = "pay_at_stall_enabled";

    private final AppSettingRepository repo;

    @Transactional(readOnly = true)
    public boolean isPayAtStallEnabled() {
        try {
            return repo.findById(KEY_PAY_AT_STALL)
                    .map(s -> "true".equalsIgnoreCase(s.getValue()))
                    .orElse(false);
        } catch (Exception e) {
            log.warn("[AppSetting] Could not read '{}' (table may not exist yet): {}", KEY_PAY_AT_STALL, e.getMessage());
            return false;
        }
    }

    @Transactional
    public boolean setPayAtStallEnabled(boolean enabled) {
        AppSetting setting = repo.findById(KEY_PAY_AT_STALL).orElseGet(() -> {
            AppSetting s = new AppSetting();
            s.setKey(KEY_PAY_AT_STALL);
            s.setDescription("Allow customers to choose \"Pay at Stall\" at checkout.");
            return s;
        });
        setting.setValue(String.valueOf(enabled));
        repo.save(setting);
        log.info("[AppSetting] '{}' set to {}", KEY_PAY_AT_STALL, enabled);
        return enabled;
    }
}



