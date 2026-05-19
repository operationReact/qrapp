package com.broandbro.qrapp.dto.bulkupload;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.List;

/**
 * Summary returned after a successful /commit call.
 */
@Data
@Builder
public class BulkMenuUploadSummary {
    private int totalRows;
    private int insertedCount;
    private int updatedCount;
    private int skippedCount;
    private int failedCount;
    private Instant committedAt;
    private String uploadMode;
    /** Any row-level errors that were skipped during commit (should be empty if pre-validated) */
    private List<RowValidationError> skippedErrors;
}

