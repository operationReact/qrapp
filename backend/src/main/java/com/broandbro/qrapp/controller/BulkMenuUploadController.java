package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.bulkupload.BulkMenuCommitRequest;
import com.broandbro.qrapp.dto.bulkupload.BulkMenuPreviewResponse;
import com.broandbro.qrapp.dto.bulkupload.BulkMenuUploadSummary;
import com.broandbro.qrapp.service.bulkupload.BulkMenuUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.cache.annotation.CacheEvict;

import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;

/**
 * REST controller for the Bulk Menu Upload feature.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>POST  /admin/menu/bulk-upload/validate  — parse + validate, no DB writes</li>
 *   <li>POST  /admin/menu/bulk-upload/commit     — persist validated rows</li>
 *   <li>GET   /admin/menu/bulk-upload/template   — download CSV sample template</li>
 * </ul>
 */
@RestController
@RequestMapping("/admin/menu/bulk-upload")
@RequiredArgsConstructor
@Slf4j
public class BulkMenuUploadController {

    private final BulkMenuUploadService uploadService;
    private final LocationAccessService locationAccessService;
    private final UserService userService;

    // =========================================================================
    // POST /admin/menu/bulk-upload/validate
    // =========================================================================

    /**
     * Parses and validates the uploaded file.
     * Returns a preview of all rows with validation errors annotated.
     * Does NOT persist anything to the database.
     *
     * @param file      the uploaded CSV or Excel file (max 10 MB enforced by Spring config)
     * @param principal injected by Spring Security — used for audit logging
     */
    @PostMapping(value = "/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BulkMenuPreviewResponse> validate(
            @RequestPart("file") MultipartFile file,
            @RequestParam Long locationId,
            Principal principal) throws Exception {
        requireLocationAccess(locationId, principal);

        String adminUser = principal != null ? principal.getName() : "unknown";
        log.info("[BulkUpload] Validate started by admin='{}' file='{}' size={}",
                adminUser, file.getOriginalFilename(), file.getSize());

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        validateFileType(file);

        BulkMenuPreviewResponse preview = uploadService.parseAndValidate(file);

        log.info("[BulkUpload] Validate complete by admin='{}': total={} valid={} invalid={}",
                adminUser, preview.getTotalRows(), preview.getValidRows(), preview.getInvalidRows());

        return ResponseEntity.ok(preview);
    }

    // =========================================================================
    // POST /admin/menu/bulk-upload/commit
    // =========================================================================

    /**
     * Commits the previously validated rows to the database.
     * Only ROW_OK rows are persisted; ROW_ERROR rows are skipped.
     */
    @PostMapping("/commit")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public ResponseEntity<BulkMenuUploadSummary> commit(
            @RequestBody BulkMenuCommitRequest request,
            Principal principal) {
        requireLocationAccess(request.getLocationId(), principal);

        String adminUser = principal != null ? principal.getName() : "unknown";
        int rowCount = request.getRows() == null ? 0 : request.getRows().size();
        log.info("[BulkUpload] Commit started by admin='{}' rows={} mode={}",
                adminUser, rowCount, request.getUploadMode());

        if (request.getRows() == null || request.getRows().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        BulkMenuUploadSummary summary = uploadService.commit(request);

        log.info("[BulkUpload] Commit complete by admin='{}': inserted={} updated={} skipped={}",
                adminUser, summary.getInsertedCount(), summary.getUpdatedCount(), summary.getSkippedCount());

        return ResponseEntity.ok(summary);
    }

    private void requireLocationAccess(Long locationId, Principal principal) {
        User user = userService.findByPhone(principal.getName()).orElseThrow();
        locationAccessService.requireLocationAccess(user, locationId);
    }

    // =========================================================================
    // GET /admin/menu/bulk-upload/template
    // =========================================================================

    /**
     * Returns a downloadable Excel (.xlsx) template file.
     */
    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() throws Exception {
        byte[] template = uploadService.generateTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=menu_bulk_upload_template.xlsx")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(template);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private void validateFileType(MultipartFile file) {
        String filename    = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();

        boolean isExcel = filename.endsWith(".xlsx") || filename.endsWith(".xls")
                || contentType.contains("spreadsheetml") || contentType.contains("ms-excel");

        if (!isExcel) {
            throw new IllegalArgumentException(
                    "Unsupported file type. Please upload the Excel template (.xlsx) provided.");
        }
    }
}
