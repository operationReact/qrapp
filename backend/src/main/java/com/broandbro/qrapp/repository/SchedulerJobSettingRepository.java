package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.SchedulerJobSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SchedulerJobSettingRepository extends JpaRepository<SchedulerJobSetting, String> {
}
