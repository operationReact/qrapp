package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.WhatsAppOtp;
import com.broandbro.qrapp.otp.OtpPurpose;
import com.broandbro.qrapp.otp.OtpStatus;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

public interface WhatsAppOtpRepository extends JpaRepository<WhatsAppOtp, Long> {
    Optional<WhatsAppOtp> findFirstByPhoneNumberAndPurposeAndStatusOrderByCreatedAtDesc(
            String phoneNumber, OtpPurpose purpose, OtpStatus status);

    long countByPhoneNumberAndPurposeAndCreatedAtAfter(
            String phoneNumber, OtpPurpose purpose, Instant after);

    long countByPhoneNumberAndCreatedAtAfter(String phoneNumber, Instant after);

    @Modifying
    @Transactional
    @Query("update WhatsAppOtp o set o.status = :status, o.updatedAt = :now " +
            "where o.phoneNumber = :phone and o.purpose = :purpose and o.status = :active")
    int invalidateActive(@Param("phone") String phoneNumber, @Param("purpose") OtpPurpose purpose,
                         @Param("active") OtpStatus active, @Param("status") OtpStatus status,
                         @Param("now") Instant now);

    @Modifying
    @Transactional
    @Query("DELETE FROM WhatsAppOtp o WHERE o.phoneNumber = :phone")
    int deleteByPhoneNumber(@Param("phone") String phoneNumber);

    /** Clear registration default location for OTP records. */
    @Modifying
    @Query("UPDATE WhatsAppOtp o SET o.registrationDefaultLocationId = null WHERE o.registrationDefaultLocationId = :locationId")
    void clearRegistrationDefaultLocation(@Param("locationId") Long locationId);
}
