package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.storage.impl.S3ImageStorageService;
import com.broandbro.qrapp.storage.ImageStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class PublicLocationImageController {
    private final LocationRepository locationRepository;
    private final S3ImageStorageService storage;

    @GetMapping("/api/public/location-images/{locationId}")
    public ResponseEntity<ByteArrayResource> image(@PathVariable Long locationId) {
        Location location = locationRepository.findById(locationId).orElseThrow();
        if (location.getLocationPhotoKey() == null) return ResponseEntity.notFound().build();
        ImageStorageService.StoredContent content = storage.readLocationImage(location.getLocationPhotoKey());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.contentType()))
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)).cachePublic())
                .body(new ByteArrayResource(content.bytes()));
    }

    @GetMapping("/api/public/location-images/{locationId}/{fileName:.+}")
    public ResponseEntity<ByteArrayResource> image(@PathVariable Long locationId,
                                                    @PathVariable String fileName) {
        Location location = locationRepository.findById(locationId).orElseThrow();
        String key = location.getLocationPhotoKey();
        if (key == null || !key.equals("local/locations/" + locationId + "/" + fileName)) {
            return ResponseEntity.notFound().build();
        }
        byte[] content = storage.readLocalImage(key);
        MediaType type = MediaTypeFactory.getMediaType(fileName).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok().contentType(type)
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)).cachePublic())
                .body(new ByteArrayResource(content));
    }
}
