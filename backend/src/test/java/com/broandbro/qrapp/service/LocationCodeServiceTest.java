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
        when(locationRepository.findMaxSequence("MHT-TG")).thenReturn(2);

        Location location = Location.builder().name("Mindspace Hi-Tech").stateUt("Telangana").build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("MHT-TG-003");
    }

    @Test
    void generatesFirstSequenceForDifferentState() {
        when(locationRepository.findMaxSequence("MIN-AP")).thenReturn(0);
        Location location = Location.builder().name("Mindspace").stateUt("Andhra Pradesh").build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("MIN-AP-001");
    }

    @Test
    void usesMeaningfulWordInitialsAndRemovesFillerWords() {
        when(locationRepository.findMaxSequence("GHS-TG")).thenReturn(0);
        Location location = Location.builder()
                .name("The GeBBS Healthcare and Solutions")
                .stateUt("Telangana")
                .build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("GHS-TG-001");
    }

    @Test
    void normalizesSpecialCharactersAndLimitsSlug() {
        when(locationRepository.findMaxSequence("VLLN-TG")).thenReturn(0);
        Location location = Location.builder()
                .name("Very Long Location Name! @#")
                .stateUt("Telangana")
                .build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("VLLN-TG-001");
    }

    @Test
    void limitsMultiWordAbbreviationToFiveLetters() {
        when(locationRepository.findMaxSequence("ABCDE-TG")).thenReturn(0);
        Location location = Location.builder()
                .name("Alpha Bravo Charlie Delta Echo Foxtrot")
                .stateUt("Telangana")
                .build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("ABCDE-TG-001");
    }

    @Test
    void usesIndependentSequenceForSameNameInDifferentState() {
        when(locationRepository.findMaxSequence("MEE-TG")).thenReturn(3);
        when(locationRepository.findMaxSequence("MEE-AP")).thenReturn(0);
        Location telangana = Location.builder().name("Meenakshi").stateUt("Telangana").build();
        Location andhra = Location.builder().name("Meenakshi").stateUt("Andhra Pradesh").build();
        when(locationRepository.save(telangana)).thenReturn(telangana);
        when(locationRepository.save(andhra)).thenReturn(andhra);
        LocationCodeService service = new LocationCodeService(locationRepository);

        service.create(telangana);
        service.create(andhra);

        assertThat(telangana.getCode()).isEqualTo("MEE-TG-004");
        assertThat(andhra.getCode()).isEqualTo("MEE-AP-001");
    }

    @Test
    void locksPrefixBeforeReadingSequenceForConcurrentCreationSafety() {
        when(locationRepository.findMaxSequence("PRA-TG")).thenReturn(0);
        Location location = Location.builder().name("Pragati").stateUt("Telangana").build();
        when(locationRepository.save(location)).thenReturn(location);

        new LocationCodeService(locationRepository).create(location);

        verify(locationRepository).lockCodePrefix("PRA-TG");
    }
}
