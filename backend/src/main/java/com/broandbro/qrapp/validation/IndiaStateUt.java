package com.broandbro.qrapp.validation;

import java.util.List;
import java.util.Set;

public final class IndiaStateUt {

    public static final List<String> VALUES = List.of(
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
            "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
            "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
            "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
            "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
            "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
            "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
    );

    private static final Set<String> LOOKUP = Set.copyOf(VALUES);

    private IndiaStateUt() {
    }

    public static boolean contains(String state) {
        return state != null && LOOKUP.contains(state.trim());
    }
}
