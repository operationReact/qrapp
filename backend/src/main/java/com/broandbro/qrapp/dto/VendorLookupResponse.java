package com.broandbro.qrapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** What an admin sees when they type a phone number while onboarding a vendor or vendor login. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorLookupResponse {
    private String phoneNumber;

    private boolean supplierExists;
    private Long supplierId;
    private String supplierName;
    private boolean supplierLinkedHere;

    private boolean loginExists;
    private String loginName;
    private boolean loginHasVendorAccessHere;
    /** True when the phone belongs to a staff/admin account, which cannot be turned into a vendor login. */
    private boolean loginBlocked;
}
