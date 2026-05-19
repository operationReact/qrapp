package com.broandbro.qrapp.dto.bulkupload;

import lombok.Builder;
import lombok.Data;
import java.util.List;

/**
 * Response returned by the /validate endpoint.
 * Contains the full parsed preview plus a summary of valid/invalid rows.
 */
@Data
@Builder
public class BulkMenuPreviewResponse {
    private int totalRows;
    private int validRows;
    private int invalidRows;
    private List<BulkMenuRowDto> rows;
}

