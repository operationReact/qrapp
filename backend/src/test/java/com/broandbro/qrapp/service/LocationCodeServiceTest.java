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
        when(locationRepository.findMaxSequence("MINDS-HYD")).thenReturn(2);

        Location location = Location.builder().name("Mindspace Hi-Tech").city("Hyderabad").build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("MINDS-HYD-003");
    }

    @Test
    void generatesFirstSequenceForDifferentState() {
        when(locationRepository.findMaxSequence("MIN-DEL")).thenReturn(0);
        Location location = Location.builder().name("Mindspace").city("Delhi").build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("MIN-DEL-001");
    }

    @Test
    void usesMeaningfulWordInitialsAndRemovesFillerWords() {
        when(locationRepository.findMaxSequence("GEBBS-HYD")).thenReturn(0);
        Location location = Location.builder()
                .name("The GeBBS Healthcare and Solutions")
                .city("Hyderabad")
                .build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("GEBBS-HYD-001");
    }

    @Test
    void normalizesSpecialCharactersAndLimitsSlug() {
        when(locationRepository.findMaxSequence("VERY-HYD")).thenReturn(0);
        Location location = Location.builder()
                .name("Very Long Location Name! @#")
                .city("Hyderabad")
                .build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("VERY-HYD-001");
    }

    @Test
    void limitsMultiWordAbbreviationToFiveLetters() {
        when(locationRepository.findMaxSequence("ALPHA-HYD")).thenReturn(0);
        Location location = Location.builder()
                .name("Alpha Bravo Charlie Delta Echo Foxtrot")
                .city("Hyderabad")
                .build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("ALPHA-HYD-001");
    }

    @Test
    void usesIndependentSequenceForSameNameInDifferentState() {
        when(locationRepository.findMaxSequence("MEENA-HYD")).thenReturn(3);
        when(locationRepository.findMaxSequence("MEENA-DEL")).thenReturn(0);
        Location telangana = Location.builder().name("Meenakshi Towers").city("Hyderabad").build();
        Location andhra = Location.builder().name("Meenakshi Towers").city("Delhi").build();
        when(locationRepository.save(telangana)).thenReturn(telangana);
        when(locationRepository.save(andhra)).thenReturn(andhra);
        LocationCodeService service = new LocationCodeService(locationRepository);

        service.create(telangana);
        service.create(andhra);

        assertThat(telangana.getCode()).isEqualTo("MEENA-HYD-004");
        assertThat(andhra.getCode()).isEqualTo("MEENA-DEL-001");
    }

    @Test
    void locksPrefixBeforeReadingSequenceForConcurrentCreationSafety() {
        when(locationRepository.findMaxSequence("PRA-HYD")).thenReturn(0);
        Location location = Location.builder().name("Pragati").city("Hyderabad").build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        verify(locationRepository).lockCodePrefix("PRA-HYD");
    }
}
