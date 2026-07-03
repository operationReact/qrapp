package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSettingRepository extends JpaRepository<AppSetting, String> {}

