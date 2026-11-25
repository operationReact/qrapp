package com.broandbro.qrapp.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import static org.junit.jupiter.api.Assertions.*;

class LocalDevelopmentGuardTest {
    private MockEnvironment local() {
        var env = new MockEnvironment()
                .withProperty("spring.datasource.url", "jdbc:postgresql://localhost:5432/broandbro_local")
                .withProperty("server.address", "127.0.0.1");
        env.setActiveProfiles("local");
        for (String key : new String[]{"spring.cloud.aws.parameterstore.enabled", "app.parameter-store.auto-create",
                "aws.s3.enabled", "whatsapp.enabled", "product.ai-image.enabled"}) {
            env.setProperty(key, "false");
        }
        return env;
    }
    @Test void acceptsDedicatedLocalDatabase() { assertDoesNotThrow(() -> LocalDevelopmentGuard.validate(local())); }
    @Test void rejectsRemoteDatabase() {
        assertThrows(IllegalStateException.class, () -> LocalDevelopmentGuard.validate(local()
                .withProperty("spring.datasource.url", "jdbc:postgresql://prod.example:5432/broandbro")));
    }
    @Test void rejectsMixedProfiles() {
        var env = local();
        env.setActiveProfiles("local", "prod");
        assertThrows(IllegalStateException.class, () -> LocalDevelopmentGuard.validate(env));
    }
    @Test void rejectsExternalCredentials() {
        assertThrows(IllegalStateException.class, () -> LocalDevelopmentGuard.validate(local()
                .withProperty("razorpay.key", "test")));
    }
    @Test void rejectsCloudServices() {
        assertThrows(IllegalStateException.class, () -> LocalDevelopmentGuard.validate(local()
                .withProperty("aws.s3.enabled", "true")));
    }
    @Test void leavesProductionUnchanged() {
        var env = new MockEnvironment();
        env.setActiveProfiles("prod");
        assertDoesNotThrow(() -> LocalDevelopmentGuard.validate(env));
    }
}
