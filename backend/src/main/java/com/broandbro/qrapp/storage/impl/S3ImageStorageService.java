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
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.time.Instant;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * AWS S3 implementation of {@link ImageStorageService}.
 *
 * <p>Folder structure for menu item images (location-scoped):
 * <pre>locations/menu-images/{locationId}/{uuid}-{epoch}.png</pre>
 *
 * <p>When {@code aws.s3.enabled=false}, falls back to a placeholder URL
 * so local development works without real AWS credentials.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class S3ImageStorageService implements ImageStorageService {
    private static final Path LOCAL_IMAGE_ROOT = Paths.get(
            System.getProperty("user.dir"), ".local-image-storage").toAbsolutePath().normalize();

    private final S3Client s3Client;
    private final AwsS3Properties props;

    @Override
    public String uploadMenuItemImage(byte[] imageBytes, Long menuItemId, Long locationId) {
        if (!props.isEnabled()) {
            log.warn("[S3] Upload disabled (aws.s3.enabled=false). Returning placeholder URL.");
            return "https://placeholder.example.com/locations/menu-images/" + locationId + "/ai-generated.png";
        }
        return uploadImage(imageBytes, "locations/menu-images/" + locationId, "image/png");
    }

    @Override
    public String uploadImage(byte[] imageBytes, String folder, String contentType) {
        return uploadImageWithKey(imageBytes, folder, contentType).url();
    }

    @Override
    public StoredImage uploadImageWithKey(byte[] imageBytes, String folder, String contentType) {
        if (!props.isEnabled()) {
            return storeLocally(imageBytes, folder, contentType);
        }
        String key = buildS3Key(folder, contentType);
        return putObject(imageBytes, props.getBucketName(), key, contentType);
    }

    @Override
    public StoredImage uploadImageWithKey(byte[] imageBytes, String folder, String fileName, String contentType) {
        String safeName = fileName == null || fileName.isBlank()
                ? UUID.randomUUID() + extension(contentType)
                : fileName.replaceAll("[^A-Za-z0-9._-]", "-");
        String key = folder + "/" + safeName;
        if (!props.isEnabled()) return storeLocallyAtKey(imageBytes, key, contentType);
        return putObject(imageBytes, props.getBucketName(), key, contentType);
    }

    @Override
    public StoredImage uploadLocationImageWithKey(byte[] imageBytes, Long locationId, String locationName,
                                                   String contentType) {
        String folder = "locations/" + locationId;
        String key = folder + "/" + safeFileName(locationName) + extension(contentType);
        if (!props.isEnabled()) {
            return storeLocally(imageBytes, key, contentType);
        }
        return putObject(imageBytes, props.getLocationBucketName(), key, contentType);
    }

    @Override
    public void deleteLocationImageByKey(String key) {
        if (key == null || key.isBlank()) return;
        if (key.startsWith("local/")) {
            deleteLocalImage(key);
            return;
        }
        if (props.isEnabled()) {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(props.getLocationBucketName()).key(key).build());
        }
    }

    @Override
    public void deleteImageByKey(String key) {
        if (key == null || key.isBlank()) return;
        if (key.startsWith("local/")) {
            deleteLocalImage(key);
            return;
        }
        if (!props.isEnabled()) return;
        if (!(key.startsWith("products/") || key.startsWith("locations/"))) {
            throw new IllegalArgumentException("Unsupported image key prefix");
        }
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(props.getBucketName()).key(key).build());
        } catch (S3Exception e) {
            throw new ImageUploadException("Could not delete image key=" + key, e);
        }
    }

    private StoredImage putObject(byte[] imageBytes, String bucket, String key, String contentType) {
        log.info("[S3] Uploading {} bytes to s3://{}/{}", imageBytes.length, bucket, key);

        try {
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .contentLength((long) imageBytes.length)
                    // Remove ACL if your bucket enforces BPA (Block Public Access)
                    // and uses a bucket policy for public reads instead.
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromBytes(imageBytes));

            String publicUrl = buildPublicUrl(bucket, key);
            log.info("[S3] Upload successful. URL: {}", publicUrl);
            return new StoredImage(publicUrl, key);

        } catch (S3Exception e) {
            log.error("[S3] Failed to upload image to {}: {}", key, e.awsErrorDetails().errorMessage(), e);
            throw new ImageUploadException(
                    "S3 upload failed for key=" + key + ": " + e.awsErrorDetails().errorMessage(), e);
        } catch (Exception e) {
            log.error("[S3] Unexpected error uploading image to {}: {}", key, e.getMessage(), e);
            throw new ImageUploadException(
                    "Unexpected error during S3 upload for key=" + key, e);
        }
    }

    public byte[] readLocalImage(String key) {
        if (key == null || !key.startsWith("local/")) {
            throw new IllegalArgumentException("Unsupported local image key");
        }

        Path file = LOCAL_IMAGE_ROOT.resolve(key.substring("local/".length())).normalize();
        if (!file.startsWith(LOCAL_IMAGE_ROOT) || !Files.isRegularFile(file)) {
            throw new IllegalArgumentException("Local image not found");
        }
        try {
            return Files.readAllBytes(file);
        } catch (IOException e) {
            throw new ImageUploadException("Could not read local image", e);
        }
    }

    public ImageStorageService.StoredContent readImage(String key) {
        if (key != null && key.startsWith("local/")) {
            String contentType = key.endsWith(".jpg") || key.endsWith(".jpeg")
                    ? "image/jpeg" : key.endsWith(".webp") ? "image/webp" : "image/png";
            return new StoredContent(readLocalImage(key), contentType);
        }
        if (key == null || key.isBlank() || !props.isEnabled()) {
            throw new IllegalArgumentException("Image storage reference is unavailable");
        }
        var response = s3Client.getObjectAsBytes(GetObjectRequest.builder()
                .bucket(props.getBucketName()).key(key).build());
        return new StoredContent(response.asByteArray(),
                response.response().contentType() == null
                        ? "application/octet-stream"
                        : response.response().contentType());
    }

    private StoredImage storeLocally(byte[] imageBytes, String folder, String contentType) {
        String key = folder.startsWith("local/") ? folder
                : "local/" + folder + "/" + UUID.randomUUID() + extension(contentType);
        Path file = LOCAL_IMAGE_ROOT.resolve(key.substring("local/".length())).normalize();
        try {
            Files.createDirectories(file.getParent());
            Files.write(file, imageBytes);
            return new StoredImage("/api/public/location-images/" + key.substring("local/".length()), key);
        } catch (IOException e) {
            throw new ImageUploadException("Could not store local image", e);
        }
    }

    private StoredImage storeLocallyAtKey(byte[] imageBytes, String key, String contentType) {
        if (!key.startsWith("local/")) key = "local/" + key;
        Path file = LOCAL_IMAGE_ROOT.resolve(key.substring("local/".length())).normalize();
        try {
            Files.createDirectories(file.getParent());
            Files.write(file, imageBytes);
            return new StoredImage("/api/public/location-images/" + key.substring("local/".length()), key);
        } catch (IOException e) {
            throw new ImageUploadException("Could not store local image", e);
        }
    }

    private void deleteLocalImage(String key) {
        Path file = LOCAL_IMAGE_ROOT.resolve(key.substring("local/".length())).normalize();
        try {
            if (file.startsWith(LOCAL_IMAGE_ROOT)) Files.deleteIfExists(file);
        } catch (IOException e) {
            log.warn("[S3] Failed to delete local image {}", key, e);
        }
    }

    private String safeFileName(String value) {
        String safe = (value == null ? "location" : value).trim()
                .replaceAll("[^A-Za-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        return safe.isBlank() ? "location" : safe;
    }

    private String extension(String contentType) {
        return "image/jpeg".equals(contentType) ? ".jpg"
                : "image/webp".equals(contentType) ? ".webp" : ".png";
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    @Override
    public void deleteImageByUrl(String publicUrl) {
        if (publicUrl == null || publicUrl.isBlank()) return;

        if (!props.isEnabled()) {
            if (publicUrl.startsWith("/api/public/location-images/")) {
                Path file = LOCAL_IMAGE_ROOT.resolve(publicUrl.substring("/api/public/location-images/".length())).normalize();
                try {
                    if (file.startsWith(LOCAL_IMAGE_ROOT)) Files.deleteIfExists(file);
                } catch (IOException e) {
                    log.warn("[S3] Failed to delete local image {}", publicUrl, e);
                }
            }
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

    private String buildS3Key(String folder, String contentType) {
        String uuid = UUID.randomUUID().toString();
        long epoch = Instant.now().getEpochSecond();
        String extension = "image/jpeg".equals(contentType) ? "jpg" : "png";
        return String.format("%s/%s-%d.%s", folder, uuid, epoch, extension);
    }

    private String buildPublicUrl(String bucket, String key) {
        String region = props.getRegion();
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);
    }
}
