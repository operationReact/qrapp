package com.broandbro.qrapp.combo.service;

import com.broandbro.qrapp.combo.dto.campaign.ComboCampaignCreateRequest;
import com.broandbro.qrapp.combo.entity.ComboCampaign;
import com.broandbro.qrapp.combo.repository.ComboCampaignRepository;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.enums.ComboStatus;
import com.broandbro.qrapp.repository.LocationRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Verifies BYOC campaign reads/mutations honour the caller's location scope,
 * that SUPER_ADMIN ("All Locations") is unrestricted, and that creation stamps the
 * requested location.
 */
class ComboCampaignLocationIsolationTest {

    private final ComboCampaignRepository campaignRepo = mock(ComboCampaignRepository.class);
    private final LocationRepository locationRepo = mock(LocationRepository.class);

    private final ComboCampaignService service = new ComboCampaignService(campaignRepo, locationRepo);

    private static Location location(long id) {
        return Location.builder().id(id).code("L" + id).name("L" + id).active(true).build();
    }

    private static ComboCampaign campaign(long id, Location location) {
        return ComboCampaign.builder()
                .id(id).name("Festive").location(location)
                .status(ComboStatus.ACTIVE).isActive(true).displayPriority(0).version(0L)
                .build();
    }

    @Test
    void superAdminListDisablesLocationFilter() {
        when(campaignRepo.findAllNonDeleted()).thenReturn(List.of());

        service.listAll(Optional.empty());

        verify(campaignRepo).findAllNonDeleted();
        verify(campaignRepo, never()).findAllNonDeletedInScope(anyCollection());
    }

    @Test
    void restrictedListIsPushedIntoQuery() {
        when(campaignRepo.findAllNonDeletedInScope(anyCollection())).thenReturn(List.of());

        service.listAll(Optional.of(List.of(10L)));

        verify(campaignRepo).findAllNonDeletedInScope(eq(List.of(10L)));
    }

    @Test
    void readOfOutOfScopeCampaignIsRejected() {
        when(campaignRepo.findActiveById(5L)).thenReturn(Optional.of(campaign(5L, location(3L))));
        when(campaignRepo.findActiveByIdAndLocationIdIn(eq(5L), anyCollection())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(5L, Optional.of(List.of(10L))))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void readOfInScopeCampaignIsAllowed() {
        when(campaignRepo.findActiveById(5L)).thenReturn(Optional.of(campaign(5L, location(10L))));
        when(campaignRepo.findActiveByIdAndLocationIdIn(eq(5L), anyCollection()))
                .thenReturn(Optional.of(campaign(5L, location(10L))));

        assertThat(service.getById(5L, Optional.of(List.of(10L))).locationId()).isEqualTo(10L);
    }

    @Test
    void createStampsRequestedLocation() {
        Location location = location(7L);
        when(locationRepo.findById(7L)).thenReturn(Optional.of(location));
        when(campaignRepo.save(org.mockito.ArgumentMatchers.any(ComboCampaign.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ComboCampaignCreateRequest req = new ComboCampaignCreateRequest(
                "Festive", 7L, "desc", null, null, 0, List.of(), List.of(), List.of());

        assertThat(service.create(req, "admin").locationId()).isEqualTo(7L);

        ArgumentCaptor<ComboCampaign> saved = ArgumentCaptor.forClass(ComboCampaign.class);
        verify(campaignRepo).save(saved.capture());
        assertThat(saved.getValue().getLocation()).isSameAs(location);
    }
}
