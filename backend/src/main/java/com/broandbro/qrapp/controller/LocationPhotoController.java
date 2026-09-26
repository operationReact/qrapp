package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.LocationResponse;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.LocationPhotoService;
import com.broandbro.qrapp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/locations")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SUPERUSER')")
public class LocationPhotoController {
    private final LocationRepository locationRepository;
    private final LocationPhotoService photoService;
    private final LocationAccessService accessService;
    private final UserService userService;

    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public LocationResponse upload(@PathVariable Long id, @RequestPart("photo") MultipartFile photo,
                                    Authentication authentication) {
        Location location = location(id);
        accessService.requireLocationAccess(userService.findByPhone(authentication.getName()).orElseThrow(), id);
        return LocationResponse.from(photoService.replace(location, photo));
    }

    @DeleteMapping("/{id}/photo")
    public LocationResponse remove(@PathVariable Long id, Authentication authentication) {
        Location location = location(id);
        accessService.requireLocationAccess(userService.findByPhone(authentication.getName()).orElseThrow(), id);
        return LocationResponse.from(photoService.remove(location));
    }

    private Location location(Long id) {
        return locationRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Location not found"));
    }
}
