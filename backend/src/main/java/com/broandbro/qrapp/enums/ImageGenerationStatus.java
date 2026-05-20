package com.broandbro.qrapp.enums;

/**
 * Tracks the lifecycle of AI-based image generation for a MenuItem.
 */
public enum ImageGenerationStatus {

    /**
     * Image generation has been requested but not yet started.
     */
    PENDING,

    /**
     * Image generation is actively in progress.
     */
    PROCESSING,

    /**
     * Image has been successfully generated and uploaded.
     */
    COMPLETED,

    /**
     * Image generation failed. See imageGenerationError for details.
     */
    FAILED
}

