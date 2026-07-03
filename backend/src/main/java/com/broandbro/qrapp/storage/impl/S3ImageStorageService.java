package com.broandbro.qrapp.storage.impl;

import com.broandbro.qrapp.config.AwsS3Properties;
import com.broandbro.qrapp.exception.ImageUploadException;
import com.broandbro.qrapp.storage.ImageStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.time.Instant;
import java.util.UUID;

/**
 * AWS S3 implementation of {@link ImageStorageService}.
 *
 * <p>Folder structure:
 * <pre>menu-items/{menuItemId}/{uuid}-{epoch}.png</pre>
 *
 * <p>When {@code aws.s3.enabled=false}, falls back to a placeholder URL
 * so local development works without real AWS credentials.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class S3ImageStorageService implements ImageStorageService {

    private final S3Client s3Client;
    private final AwsS3Properties props;

    @Override
    public String uploadMenuItemImage(byte[] imageBytes, Long menuItemId) {

        if (!props.isEnabled()) {
            log.warn("[S3] Upload disabled (aws.s3.enabled=false). Returning placeholder URL.");
            return "https://placeholder.example.com/menu-items/" + menuItemId + "/ai-generated.png";
        }

        String key = buildS3Key(menuItemId);
        String bucket = props.getBucketName();

        log.info("[S3] Uploading {} bytes to s3://{}/{}", imageBytes.length, bucket, key);

        try {
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType("image/png")
                    .contentLength((long) imageBytes.length)
                    // Remove ACL if your bucket enforces BPA (Block Public Access)
                    // and uses a bucket policy for public reads instead.
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromBytes(imageBytes));

            String publicUrl = buildPublicUrl(bucket, key);
            log.info("[S3] Upload successful. URL: {}", publicUrl);
            return publicUrl;

        } catch (S3Exception e) {
            log.error("[S3] Failed to upload image for menuItemId={}: {}", menuItemId, e.awsErrorDetails().errorMessage(), e);
            throw new ImageUploadException(
                    "S3 upload failed for menuItemId=" + menuItemId + ": " + e.awsErrorDetails().errorMessage(), e);
        } catch (Exception e) {
            log.error("[S3] Unexpected error uploading image for menuItemId={}: {}", menuItemId, e.getMessage(), e);
            throw new ImageUploadException(
                    "Unexpected error during S3 upload for menuItemId=" + menuItemId, e);
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    @Override
    public void deleteImageByUrl(String publicUrl) {
        if (publicUrl == null || publicUrl.isBlank()) return;

        if (!props.isEnabled()) {
            log.warn("[S3] Delete disabled (aws.s3.enabled=false). Skipping deletion of {}", publicUrl);
            return;
        }

        String key = extractKeyFromUrl(publicUrl);
        if (key == null) {
            log.warn("[S3] Could not extract S3 key from URL: {}", publicUrl);
            return;
        }

        String bucket = props.getBucketName();
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
            log.info("[S3] Deleted s3://{}/{}", bucket, key);
        } catch (S3Exception e) {
            log.warn("[S3] Failed to delete s3://{}/{}: {}", bucket, key, e.awsErrorDetails().errorMessage());
        } catch (Exception e) {
            log.warn("[S3] Unexpected error deleting {}: {}", publicUrl, e.getMessage());
        }
    }

    private String extractKeyFromUrl(String publicUrl) {
        // URL format: https://{bucket}.s3.{region}.amazonaws.com/{key}
        try {
            java.net.URI uri = java.net.URI.create(publicUrl);
            String path = uri.getPath(); // e.g. "/menu-items/1/uuid-epoch.png"
            if (path.startsWith("/")) {
                return path.substring(1);
            }
            return path;
        } catch (Exception e) {
            return null;
        }
    }

    private String buildS3Key(Long menuItemId) {
        String uuid = UUID.randomUUID().toString();
        long epoch = Instant.now().getEpochSecond();
        return String.format("menu-items/%d/%s-%d.png", menuItemId, uuid, epoch);
    }

    private String buildPublicUrl(String bucket, String key) {
        String region = props.getRegion();
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);
    }
}

