package com.broandbro.qrapp.service;

import com.broandbro.qrapp.exception.OtpException;
import com.broandbro.qrapp.repository.UserRepository;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class GoogleCustomerAuthServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final UserService userService = mock(UserService.class);

    @Test void missingClientIdDisablesGoogleWithoutExternalRequests() {
        var service = new GoogleCustomerAuthService("", users, userService);
        assertThat(service.challenge()).containsEntry("enabled", false);
        assertThatThrownBy(() -> service.exchange("anything", "anything")).isInstanceOf(OtpException.class);
        verifyNoInteractions(users, userService);
    }

    @Test void challengeUsesUniqueNonceAndUnknownNonceIsRejected() {
        var service = new GoogleCustomerAuthService("test.apps.googleusercontent.com", users, userService);
        assertThat(service.challenge().get("nonce")).isNotEqualTo(service.challenge().get("nonce"));
        assertThatThrownBy(() -> service.exchange("anything", "unknown")).isInstanceOf(OtpException.class);
        verifyNoInteractions(users, userService);
    }

    @Test void unknownLinkTicketCannotAttachIdentity() {
        var service = new GoogleCustomerAuthService("", users, userService);
        assertThatThrownBy(() -> service.linkAfterOtp(null, "unknown")).hasMessage("google_link_expired");
        verifyNoInteractions(users, userService);
    }
}
