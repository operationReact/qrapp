package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.repository.LocationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocationCodeServiceTest {
    @Mock
    LocationRepository locationRepository;

    @Test
    void usesOneGlobalSequenceAcrossPrefixesAndStates() {
        when(locationRepository.nextGlobalCodeSequence()).thenReturn(1L, 2L, 3L);

        Location first = location("GeBBS Healthcare Solutions", "Telangana");
        Location second = location("Bro & Bro", "Telangana");
        Location third = location("ABC Foods", "Karnataka");

        new LocationCodeService(locationRepository).create(first);
        new LocationCodeService(locationRepository).create(second);
        new LocationCodeService(locationRepository).create(third);

        assertThat(first.getCode()).isEqualTo("GEBBS-TG-001");
        assertThat(second.getCode()).isEqualTo("BROBRO-TG-002");
        assertThat(third.getCode()).isEqualTo("ABC-KA-003");
    }

    @Test
    void formatsSequencesAboveNinetyNineWithoutTruncation() {
        when(locationRepository.nextGlobalCodeSequence()).thenReturn(100L);
        Location location = location("Urban", "Maharashtra");

        new LocationCodeService(locationRepository).create(location);

        assertThat(location.getCode()).isEqualTo("URBAN-MH-100");
    }

    @Test
    void preservesSequenceWhenAutomaticLocationChangesState() {
        Location location = location("GeBBS Healthcare Solutions", "Karnataka");
        location.setId(7L);
        location.setCode("GEBBS-TG-001");
        location.setCodeSequence(1L);
        location.setCodeManuallyEdited(false);
        when(locationRepository.existsByCodeAndIdNot("GEBBS-KA-001", 7L)).thenReturn(false);

        new LocationCodeService(locationRepository).update(location, "GEBBS-KA-001");

        assertThat(location.getCode()).isEqualTo("GEBBS-KA-001");
        assertThat(location.getCodeSequence()).isEqualTo(1L);
        assertThat(location.getCodeManuallyEdited()).isFalse();
    }

    @Test
    void preservesManualCodeWhenNameOrStateChanges() {
        Location location = location("GeBBS Healthcare Solutions", "Karnataka");
        location.setId(7L);
        location.setCode("GEBBS-HYD-001");
        location.setCodeSequence(1L);
        location.setCodeManuallyEdited(true);

        new LocationCodeService(locationRepository).update(location, "GEBBS-HYD-001");

        assertThat(location.getCode()).isEqualTo("GEBBS-HYD-001");
        assertThat(location.getCodeManuallyEdited()).isTrue();
    }

    @Test
    void rejectsDuplicateManualCode() {
        Location location = location("ABC Foods", "Karnataka");
        location.setId(8L);
        when(locationRepository.existsByCode("ABC-KA-001")).thenReturn(true);

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> new LocationCodeService(locationRepository).create(location, "ABC-KA-001"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Location code already exists. Please use a different code.");
    }

    @Test
    void regeneratesLegacyCodeWhenNoCodeIsRequested() {
        Location location = location("Meenakshi Towers", "Telangana");
        location.setId(2L);
        location.setCode("MEENAKSHI_TOWERS");
        location.setCodeManuallyEdited(true);
        when(locationRepository.nextGlobalCodeSequence()).thenReturn(4L);
        when(locationRepository.existsByCodeAndIdNot("MEENAKSHI-TG-004", 2L)).thenReturn(false);

        new LocationCodeService(locationRepository).update(location, "");

        assertThat(location.getCode()).isEqualTo("MEENAKSHI-TG-004");
        assertThat(location.getCodeSequence()).isEqualTo(4L);
        assertThat(location.getCodeManuallyEdited()).isFalse();
    }

    private Location location(String name, String state) {
        return Location.builder().name(name).stateUt(state).build();
    }
}
