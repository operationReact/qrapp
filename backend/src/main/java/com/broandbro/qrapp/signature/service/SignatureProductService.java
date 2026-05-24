package com.broandbro.qrapp.signature.service;

import com.broandbro.qrapp.enums.SignatureInventoryOperation;
import com.broandbro.qrapp.signature.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SignatureProductService {

    SignatureProductResponse createProduct(SignatureProductCreateRequest request);
    SignatureProductResponse updateProduct(Long id, SignatureProductCreateRequest request);
    SignatureProductResponse getProductById(Long id);
    Page<SignatureProductCardResponse> listProducts(String search, String category, Boolean isActive,
                                                    Boolean isFeatured, Boolean isComboAttachable,
                                                    Pageable pageable);
    SignatureProductResponse toggleStatus(Long id, boolean isActive, String updatedBy);
    SignatureProductResponse updateStock(Long id, StockUpdateRequest request, String updatedBy);
    void deleteProduct(Long id, String deletedBy);
    SignatureProductAnalyticsResponse getAnalytics();
}

