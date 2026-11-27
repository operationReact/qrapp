package com.broandbro.qrapp.service;

import com.broandbro.qrapp.exception.OtpException;
import com.broandbro.qrapp.repository.UserRepository;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AppleCustomerAuthServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final UserService userService = mock(UserService.class);

    private AppleCustomerAuthService service(String clientIds) {
        return new AppleCustomerAuthService(clientIds, "", users, userService);
    }

    @Test void missingClientIdsDisablesAppleWithoutExternalRequests() {
        var service = service("");
        assertThat(service.enabled()).isFalse();
        assertThat(service.challenge()).containsEntry("enabled", false);
        assertThatThrownBy(() -> service.exchange("anything", "anything")).isInstanceOf(OtpException.class);
        verifyNoInteractions(users, userService);
    }

    @Test void challengeUsesUniqueNonceAndUnknownNonceIsRejected() {
        var service = service("in.broandbro.signin,in.broandbro.app");
        assertThat(service.enabled()).isTrue();
        var challenge = service.challenge();
        assertThat(challenge).containsEntry("enabled", true)
                .containsEntry("clientId", "in.broandbro.signin");
        assertThat(challenge.get("nonce")).isNotEqualTo(service.challenge().get("nonce"));
        assertThatThrownBy(() -> service.exchange("anything", "unknown")).isInstanceOf(OtpException.class);
        verifyNoInteractions(users, userService);
    }

    @Test void unknownLinkTicketCannotAttachIdentity() {
        var service = service("");
        assertThat(service.ownsTicket("unknown")).isFalse();
        assertThatThrownBy(() -> service.linkAfterOtp(null, "unknown")).hasMessage("apple_link_expired");
        verifyNoInteractions(users, userService);
    }
}
