package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.repository.LocationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocationCodeServiceTest {
    @Mock
    LocationRepository locationRepository;

    @Test
    void generatesReadableSlugAndNumericCollisionSuffix() {
        when(locationRepository.findMaxSequence("MINDSPACE-HI-TECH-TG")).thenReturn(2);

        Location location = Location.builder().name("Mindspace Hi-Tech").stateUt("Telangana").build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("MINDSPACE-HI-TECH-TG-003");
    }

    @Test
    void generatesFirstSequenceForDifferentState() {
        when(locationRepository.findMaxSequence("MINDSPACE-AP")).thenReturn(0);
        Location location = Location.builder().name("Mindspace").stateUt("Andhra Pradesh").build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("MINDSPACE-AP-001");
    }

    @Test
    void normalizesSpecialCharactersAndLimitsSlug() {
        when(locationRepository.findMaxSequence("VERY-LONG-LOCATION-N-TG")).thenReturn(0);
        Location location = Location.builder()
                .name("Very Long Location Name! @#")
                .stateUt("Telangana")
                .build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("VERY-LONG-LOCATION-N-TG-001");
    }

    @Test
    void usesIndependentSequenceForSameNameInDifferentState() {
        when(locationRepository.findMaxSequence("MEENAKSHI-TG")).thenReturn(3);
        when(locationRepository.findMaxSequence("MEENAKSHI-AP")).thenReturn(0);
        Location telangana = Location.builder().name("Meenakshi").stateUt("Telangana").build();
        Location andhra = Location.builder().name("Meenakshi").stateUt("Andhra Pradesh").build();
        when(locationRepository.save(telangana)).thenReturn(telangana);
        when(locationRepository.save(andhra)).thenReturn(andhra);
        LocationCodeService service = new LocationCodeService(locationRepository);

        service.create(telangana);
        service.create(andhra);

        assertThat(telangana.getCode()).isEqualTo("MEENAKSHI-TG-004");
        assertThat(andhra.getCode()).isEqualTo("MEENAKSHI-AP-001");
    }

    @Test
    void locksPrefixBeforeReadingSequenceForConcurrentCreationSafety() {
        when(locationRepository.findMaxSequence("PRAGATI-TG")).thenReturn(0);
        Location location = Location.builder().name("Pragati").stateUt("Telangana").build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        verify(locationRepository).lockCodePrefix("PRAGATI-TG");
    }
}
