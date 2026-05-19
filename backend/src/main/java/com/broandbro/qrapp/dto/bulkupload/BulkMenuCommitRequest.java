package com.broandbro.qrapp.dto.bulkupload;

import lombok.Data;
import java.util.List;

/**
 * Request body for the /commit endpoint.
 * The frontend sends back the validated rows (only ROW_OK rows will be persisted).
 */
@Data
public class BulkMenuCommitRequest {

    /** INSERT_ONLY | UPDATE_ONLY | UPSERT */
    private String uploadMode = "INSERT_ONLY";

    /**
     * When true, categories that do not already exist will be auto-created.
     * When false, unknown categories are treated as validation failures.
     */
    private boolean autoCreateCategories = true;

    /** The validated row list as returned by /validate */
    private List<BulkMenuRowDto> rows;
}

