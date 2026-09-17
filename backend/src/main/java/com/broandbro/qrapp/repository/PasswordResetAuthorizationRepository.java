package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.PasswordResetAuthorization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordResetAuthorizationRepository extends JpaRepository<PasswordResetAuthorization, Long> {
    Optional<PasswordResetAuthorization> findFirstByPhoneNumberAndUsedAtIsNullOrderByCreatedAtDesc(String phoneNumber);
}
