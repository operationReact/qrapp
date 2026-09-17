package com.broandbro.qrapp.otp;

import com.broandbro.qrapp.exception.OtpException;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class PhoneNumberNormalizer {
    private static final Pattern INDIA = Pattern.compile("^(?:\\+91|91|0)?([6-9]\\d{9})$");

    private PhoneNumberNormalizer() {
    }

    public static String normalize(String raw) {
        if (raw == null) throw new OtpException("invalid_phone_number");
        String compact = raw.trim().replaceAll("[\\s()-]", "");
        Matcher matcher = INDIA.matcher(compact);
        if (!matcher.matches()) throw new OtpException("invalid_phone_number");
        return "+91" + matcher.group(1);
    }

    public static String mask(String phone) {
        if (phone == null || phone.length() < 7) return "***";
        return phone.substring(0, Math.min(3, phone.length())) + "******"
                + phone.substring(phone.length() - 4);
    }
}
