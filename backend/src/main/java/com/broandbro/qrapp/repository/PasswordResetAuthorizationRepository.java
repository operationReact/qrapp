package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.PasswordResetAuthorization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface PasswordResetAuthorizationRepository extends JpaRepository<PasswordResetAuthorization, Long> {
    Optional<PasswordResetAuthorization> findFirstByPhoneNumberAndUsedAtIsNullOrderByCreatedAtDesc(String phoneNumber);

    @Modifying
    @Transactional
    @Query("DELETE FROM PasswordResetAuthorization p WHERE p.phoneNumber = :phone")
    int deleteByPhoneNumber(@Param("phone") String phoneNumber);
}
