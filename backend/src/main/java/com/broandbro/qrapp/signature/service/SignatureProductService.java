package com.broandbro.qrapp.signature.service;

import com.broandbro.qrapp.enums.SignatureInventoryOperation;
import com.broandbro.qrapp.signature.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface SignatureProductService {

    SignatureProductResponse createProduct(SignatureProductCreateRequest request);
    SignatureProductResponse updateProduct(Long id, SignatureProductCreateRequest request,
                                           Optional<List<Long>> locationScope);
    SignatureProductResponse getProductById(Long id, Optional<List<Long>> locationScope);
    Page<SignatureProductCardResponse> listProducts(String search, String category, Boolean isActive,
                                                    Boolean isFeatured, Boolean isComboAttachable,
                                                    Pageable pageable, Optional<List<Long>> locationScope);
    SignatureProductResponse toggleStatus(Long id, boolean isActive, String updatedBy,
                                          Optional<List<Long>> locationScope);
    SignatureProductResponse updateStock(Long id, StockUpdateRequest request, String updatedBy,
                                         Optional<List<Long>> locationScope);
    void deleteProduct(Long id, String deletedBy, Optional<List<Long>> locationScope);
    SignatureProductAnalyticsResponse getAnalytics();
}

