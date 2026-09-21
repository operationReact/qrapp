package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.recommendation.controller.GrowthAdminController;
import com.broandbro.qrapp.recommendation.scheduler.CoOccurrenceScheduler;
import com.broandbro.qrapp.recommendation.service.*;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.repository.LocationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.*;

class RecommendationAdminIsolationTest {

    @Test
    void recommendationAndUpsellReadsUseAuthorizedLocation() {
        ManualRecommendationService manual = mock(ManualRecommendationService.class);
        UpsellRuleService upsell = mock(UpsellRuleService.class);
        when(manual.getAll(1L)).thenReturn(List.of());
        when(upsell.getAllIncludingInactive(1L)).thenReturn(List.of());
        GrowthAdminController controller = controller(manual, upsell);

        controller.getAllRecommendations(1L, authentication());
        controller.getAllUpsellRules(1L, authentication());

        verify(manual).getAll(1L);
        verify(upsell).getAllIncludingInactive(1L);
        verify(manual, never()).getAll(2L);
        verify(upsell, never()).getAllIncludingInactive(2L);
    }

    private static GrowthAdminController controller(
            ManualRecommendationService manual, UpsellRuleService upsell) {
        LocationRepository locations = mock(LocationRepository.class);
        when(locations.findById(1L)).thenReturn(Optional.of(
                Location.builder().id(1L).name("Mindspace").active(true).build()));
        UserService users = mock(UserService.class);
        when(users.findByPhone("admin")).thenReturn(Optional.of(User.builder().build()));
        return new GrowthAdminController(manual, mock(AutoSuggestionService.class), upsell,
                mock(CategoryPairingService.class), mock(CoOccurrenceScheduler.class),
                mock(RecommendationInteractionService.class),
                mock(ComboOpportunityService.class), locations,
                mock(LocationAccessService.class), users);
    }

    private static Authentication authentication() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("admin");
        return auth;
    }
}
