package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.SchedulerJobRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface SchedulerJobRunRepository extends JpaRepository<SchedulerJobRun, Long> {

    Optional<SchedulerJobRun> findFirstByJobIdOrderByStartedAtDesc(String jobId);

    Optional<SchedulerJobRun> findFirstByJobIdAndStatusOrderByStartedAtDesc(String jobId, String status);

    @Query("""
            select r from SchedulerJobRun r
            where (:jobId is null or r.jobId = :jobId)
              and (:status is null or r.status = :status)
            order by r.startedAt desc, r.id desc
            """)
    Page<SchedulerJobRun> search(@Param("jobId") String jobId,
                                 @Param("status") String status,
                                 Pageable pageable);

    @Transactional
    @Modifying
    @Query("delete from SchedulerJobRun r where r.startedAt < :cutoff")
    int deleteStartedBefore(@Param("cutoff") LocalDateTime cutoff);
}
