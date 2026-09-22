package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.repository.LocationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocationCodeServiceTest {
    @Mock
    LocationRepository locationRepository;

    @Test
    void generatesReadableSlugAndNumericCollisionSuffix() {
        when(locationRepository.findByCode("mindspace-hi-tech")).thenReturn(Optional.of(Location.builder().build()));
        when(locationRepository.findByCode("mindspace-hi-tech-2")).thenReturn(Optional.of(Location.builder().build()));
        when(locationRepository.findByCode("mindspace-hi-tech-3")).thenReturn(Optional.empty());

        String code = new LocationCodeService(locationRepository)
                .generate(null, "Mindspace Hi-Tech");

        assertThat(code).isEqualTo("mindspace-hi-tech-3");
    }

    @Test
    void usesExplicitCodeAsSlugBaseWhenProvided() {
        when(locationRepository.findByCode("tower-a")).thenReturn(Optional.empty());

        String code = new LocationCodeService(locationRepository)
                .generate("Tower A", "Ignored Name");

        assertThat(code).isEqualTo("tower-a");
    }
}
