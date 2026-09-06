package com.broandbro.qrapp.service;

public interface TwoFactorClient {
    /**
     * Request 2Factor to generate an OTP for the given normalized Indian mobile (10 digits).
     * Returns the session id on success.
     */
    String generateOtp(String mobile) throws TwoFactorException;

    /**
     * Verify OTP using sessionId returned by generateOtp.
     * Returns true if verification succeeds.
     */
    boolean verifyOtp(String sessionId, String otp) throws TwoFactorException;
}
