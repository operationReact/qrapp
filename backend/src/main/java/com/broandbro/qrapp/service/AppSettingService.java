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
        return isPayAtStallEnabled(null);
    }

    @Transactional(readOnly = true)
    public boolean isPayAtStallEnabled(Long locationId) {
        try {
            AppSetting setting = getLocationSetting(KEY_PAY_AT_STALL, locationId).orElse(null);
            if (setting == null) setting = repo.findById(KEY_PAY_AT_STALL).orElse(null);
            return setting != null && "true".equalsIgnoreCase(setting.getValue());
        } catch (Exception e) {
            log.warn("[AppSetting] Could not read '{}' (table may not exist yet): {}", KEY_PAY_AT_STALL, e.getMessage());
            return false;
        }
    }

    @Transactional
    public boolean setPayAtStallEnabled(boolean enabled) {
        return setPayAtStallEnabled(null, enabled);
    }

    @Transactional
    public boolean setPayAtStallEnabled(Long locationId, boolean enabled) {
        AppSetting setting = repo.findById(KEY_PAY_AT_STALL).orElseGet(() -> {
            AppSetting s = new AppSetting();
            s.setKey(KEY_PAY_AT_STALL);
            s.setDescription("Allow customers to choose \"Pay at Stall\" at checkout.");
            return s;
        });
        setting = settingFor(KEY_PAY_AT_STALL, locationId, setting);
        setting.setValue(String.valueOf(enabled));
        repo.save(setting);
        log.info("[AppSetting] '{}' set to {}", KEY_PAY_AT_STALL, enabled);
        return enabled;
    }

    @Transactional(readOnly = true)
    public boolean isWalletEnabled(Long locationId) {
        return getBooleanSetting("wallet_enabled", locationId, true);
    }

    @Transactional
    public boolean setWalletEnabled(Long locationId, boolean enabled) {
        return setBooleanSetting("wallet_enabled", locationId, enabled);
    }

    @Transactional(readOnly = true)
    public boolean isRazorpayEnabled(Long locationId, boolean globalDefault) {
        return getBooleanSetting("razorpay_enabled", locationId, globalDefault);
    }

    @Transactional
    public boolean setRazorpayEnabled(Long locationId, boolean enabled) {
        return setBooleanSetting("razorpay_enabled", locationId, enabled);
    }

    @Transactional(readOnly = true)
    public boolean isHallOfHappinessEnabled(Long locationId) {
        return getBooleanSetting("hall_of_happiness_enabled", locationId, true);
    }

    @Transactional
    public boolean setHallOfHappinessEnabled(Long locationId, boolean enabled) {
        return setBooleanSetting("hall_of_happiness_enabled", locationId, enabled);
    }

    private java.util.Optional<AppSetting> getLocationSetting(String key, Long locationId) {
        return locationId == null ? java.util.Optional.empty()
                : repo.findById(key + "_" + locationId);
    }

    private boolean getBooleanSetting(String key, Long locationId, boolean defaultValue) {
        return getLocationSetting(key, locationId)
                .map(s -> "true".equalsIgnoreCase(s.getValue())).orElse(defaultValue);
    }

    private AppSetting settingFor(String key, Long locationId, AppSetting fallback) {
        if (locationId == null) return fallback;
        return repo.findById(key + "_" + locationId).orElseGet(() -> {
            AppSetting setting = new AppSetting();
            setting.setKey(key + "_" + locationId);
            setting.setDescription(key + " override for location " + locationId);
            return setting;
        });
    }

    private boolean setBooleanSetting(String key, Long locationId, boolean enabled) {
        if (locationId == null) throw new IllegalArgumentException("locationId_required");
        AppSetting setting = settingFor(key, locationId, null);
        setting.setValue(String.valueOf(enabled));
        repo.save(setting);
        return enabled;
    }
}
