package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "invoice_configurations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceConfiguration {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String invoicePrefix = "BB";

    @Builder.Default
    @Column(nullable = false, length = 60)
    private String invoiceNumberFormat = "BB/{FY}/{SEQ}";

    @Builder.Default
    @Column(nullable = false, length = 80)
    private String invoiceTitle = "TAX INVOICE";

    private String businessName;
    private String tradeName;
    private String gstin;
    private String fssaiLicense;
    private String pan;

    @Column(columnDefinition = "TEXT")
    private String registeredAddress;
    private String city;
    private String state;
    private String stateCode;
    private String pincode;
    private String phone;
    private String email;
    private String website;

    private String logoAssetUrl;
    private String logoAssetKey;
    private String signatureAssetUrl;
    private String signatureAssetKey;
    private String paymentQrAssetUrl;
    private String paymentQrAssetKey;

    @Builder.Default
    @Column(nullable = false)
    private Boolean signatureEnabled = false;
    @Builder.Default
    @Column(nullable = false, length = 20)
    private String signatureType = "TEXT";
    private String signatoryName;
    private String signatoryDesignation;

    @Builder.Default private Boolean showGstin = true;
    @Builder.Default private Boolean showFssai = true;
    @Builder.Default private Boolean showPan = true;
    @Builder.Default private Boolean showCustomerAddress = true;
    @Builder.Default private Boolean showPaymentQr = true;
    @Builder.Default private Boolean showHsnSac = true;
    @Builder.Default private Boolean showSignature = true;
    @Builder.Default private Boolean showOrderId = true;

    @Column(columnDefinition = "TEXT")
    private String footerText;
    @Builder.Default private String primaryColor = "#171717";
    @Builder.Default private String accentColor = "#B8893C";
    @Builder.Default private String templateCode = "BRO_AND_BRO_MODERN";

    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
