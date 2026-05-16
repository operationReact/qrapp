package com.broandbro.qrapp.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ImageUploadResponse {
    private Long id;
    private Long menuItemId;
    private String fileName;
    private String contentType;
    private Long fileSize;
    private String imageUrl;
    private boolean replaced;
    private String message;
    private String createdBy;
    private String updatedBy;
}

