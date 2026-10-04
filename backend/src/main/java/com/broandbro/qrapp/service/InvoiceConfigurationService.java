package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.InvoiceConfiguration;
import com.broandbro.qrapp.repository.InvoiceConfigurationRepository;
import com.broandbro.qrapp.storage.ImageStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class InvoiceConfigurationService {
    private final InvoiceConfigurationRepository repository;
    private final ImageStorageService storage;

    @Transactional(readOnly = true)
    public InvoiceConfiguration findGlobal() {
        return repository.findTopByOrderByIdAsc().orElseGet(InvoiceConfiguration::new);
    }

    @Transactional
    public InvoiceConfiguration save(InvoiceConfiguration configuration) {
        validate(configuration);
        return repository.save(configuration);
    }

    @Transactional
    public InvoiceConfiguration upload(String assetType, MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Invoice asset must not be empty");
        String normalizedAssetType = assetType == null ? "" : assetType.toLowerCase(Locale.ROOT);
        if (!normalizedAssetType.equals("logo")
                && !normalizedAssetType.equals("signature")
                && !normalizedAssetType.equals("payment-qr")) {
            throw new IllegalArgumentException("Unsupported invoice asset type");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!contentType.equals("image/png") && !contentType.equals("image/jpeg")
                && !contentType.equals("image/webp")) {
            throw new IllegalArgumentException("Invoice asset must be PNG, JPEG, or WEBP");
        }
        try {
            ImageStorageService.StoredImage stored = storage.uploadLocationImageWithKey(
                    file.getBytes(), 0L, "invoice-" + normalizedAssetType, contentType);
            InvoiceConfiguration config = repository.findTopByOrderByIdAsc()
                    .orElseGet(() -> InvoiceConfiguration.builder().build());
            switch (normalizedAssetType) {
                case "logo" -> {
                    config.setLogoAssetUrl(stored.url());
                    config.setLogoAssetKey(stored.key());
                }
                case "signature" -> {
                    config.setSignatureAssetUrl(stored.url());
                    config.setSignatureAssetKey(stored.key());
                }
                case "payment-qr" -> {
                    config.setPaymentQrAssetUrl(stored.url());
                    config.setPaymentQrAssetKey(stored.key());
                }
            }
            return repository.save(config);
        } catch (IOException ex) {
            throw new IllegalArgumentException("Could not read invoice asset", ex);
        }
    }

    private void validate(InvoiceConfiguration config) {
        if (config.getBusinessName() == null || config.getBusinessName().isBlank()) {
            throw new IllegalArgumentException("Business name is required");
        }
        if (config.getInvoiceTitle() == null || config.getInvoiceTitle().isBlank()) {
            throw new IllegalArgumentException("Invoice title is required");
        }
        if (config.getInvoicePrefix() == null || config.getInvoicePrefix().isBlank()) {
            throw new IllegalArgumentException("Invoice prefix is required");
        }
        if (config.getSignatureType() == null
                || (!config.getSignatureType().equals("TEXT") && !config.getSignatureType().equals("UPLOADED"))) {
            throw new IllegalArgumentException("Signature type must be TEXT or UPLOADED");
        }
        validateColor(config.getPrimaryColor());
        validateColor(config.getAccentColor());
    }

    private void validateColor(String color) {
        if (color != null && !color.matches("^#[0-9A-Fa-f]{6}$")) {
            throw new IllegalArgumentException("Colors must be six-digit hex values");
        }
    }
}
