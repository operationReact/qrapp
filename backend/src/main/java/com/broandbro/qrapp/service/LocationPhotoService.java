package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.exception.FileTooLargeException;
import com.broandbro.qrapp.exception.InvalidImageException;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.storage.ImageStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class LocationPhotoService {
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024L;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");

    private final ImageStorageService storage;
    private final LocationRepository locationRepository;

    @Transactional
    public Location replace(Location location, MultipartFile file) {
        validate(file);
        ImageStorageService.StoredImage stored;
        try {
            String contentType = file.getContentType() == null
                    ? ""
                    : file.getContentType().toLowerCase(Locale.ROOT);
            stored = storage.uploadLocationImageWithKey(file.getBytes(), location.getId(), location.getName(),
                    contentType);
        } catch (IOException e) {
            throw new InvalidImageException("Could not read location photo");
        }
        deletePrevious(location);
        location.setLocationPhotoUrl(stored.url());
        location.setLocationPhotoKey(stored.key());
        return locationRepository.save(location);
    }

    @Transactional
    public Location remove(Location location) {
        deletePrevious(location);
        location.setLocationPhotoUrl(null);
        location.setLocationPhotoKey(null);
        return locationRepository.save(location);
    }

    private void deletePrevious(Location location) {
        if (location.getLocationPhotoKey() != null) {
            storage.deleteLocationImageByKey(location.getLocationPhotoKey());
        } else if (location.getLocationPhotoUrl() != null) {
            storage.deleteImageByUrl(location.getLocationPhotoUrl());
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidImageException("Photo must not be empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new FileTooLargeException("Photo size exceeds maximum allowed 5 MB");
        }
        String contentType = file.getContentType();
        String name = file.getOriginalFilename();
        String extension = name == null || !name.contains(".")
                ? "" : name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase(Locale.ROOT))
                || !ALLOWED_EXTENSIONS.contains(extension)
                || !matches(contentType, extension)) {
            throw new InvalidImageException("Invalid photo type. Allowed: JPG, JPEG, PNG, WEBP");
        }
    }

    private boolean matches(String contentType, String extension) {
        return contentType.equalsIgnoreCase("image/jpeg") && Set.of("jpg", "jpeg").contains(extension)
                || contentType.equalsIgnoreCase("image/png") && extension.equals("png")
                || contentType.equalsIgnoreCase("image/webp") && extension.equals("webp");
    }
}
