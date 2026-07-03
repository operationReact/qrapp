package com.broandbro.qrapp.service.bulkupload;

import com.broandbro.qrapp.dto.bulkupload.BulkMenuRowDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Strategy interface for parsing bulk menu upload files.
 * Implementations exist for CSV (.csv) and Excel (.xlsx / .xls).
 */
public interface BulkMenuFileParser {

    /**
     * Returns true if this parser supports the given filename/content type.
     */
    boolean supports(String filename, String contentType);

    /**
     * Parse the uploaded file and return a list of raw (unvalidated) row DTOs.
     * Row numbers are 1-based (row 1 = first data row after header).
     */
    List<BulkMenuRowDto> parse(MultipartFile file) throws Exception;
}

