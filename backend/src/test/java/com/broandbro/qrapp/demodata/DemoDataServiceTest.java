package com.broandbro.qrapp.demodata;

import com.broandbro.qrapp.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DemoDataServiceTest {
    private DemoDataService service(boolean enabled, String profile, String identities) {
        return new DemoDataService(mock(JdbcTemplate.class), mock(PasswordEncoder.class),
                mock(LocationRepository.class), mock(PartnerRepository.class), mock(PartnerLocationRepository.class),
                mock(UserRepository.class), mock(UserLocationAccessRepository.class), mock(CategoryRepository.class),
                mock(ProductRepository.class), mock(MenuRepository.class), mock(VendorRepository.class),
                mock(LocationProductRepository.class), mock(ProductInventoryRepository.class),
                mock(OrderRepository.class), mock(OrderItemRepository.class), identities, profile, enabled);
    }

    @Test
    void refusesWhenExplicitOptInIsMissing() {
        DemoDataService fixture = service(false, "dev", "demo/db");
        IllegalStateException error = assertThrows(IllegalStateException.class, fixture::verify);
        assertTrue(error.getMessage().contains("disabled"));
    }

    @Test
    void refusesWhenProductionIsActiveAlongsideDevelopment() {
        DemoDataService fixture = service(true, "dev,prod", "demo/db");
        IllegalStateException error = assertThrows(IllegalStateException.class, fixture::verify);
        assertTrue(error.getMessage().contains("production approval"));
    }

    @Test
    void refusesARealOrUnlistedDatabaseIdentity() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(startsWith("select current_database"), eq(String.class))).thenReturn("business/db");
        DemoDataService fixture = new DemoDataService(jdbc, mock(PasswordEncoder.class),
                mock(LocationRepository.class), mock(PartnerRepository.class), mock(PartnerLocationRepository.class),
                mock(UserRepository.class), mock(UserLocationAccessRepository.class), mock(CategoryRepository.class),
                mock(ProductRepository.class), mock(MenuRepository.class), mock(VendorRepository.class),
                mock(LocationProductRepository.class), mock(ProductInventoryRepository.class),
                mock(OrderRepository.class), mock(OrderItemRepository.class), "demo/db", "dev", true);
        IllegalStateException error = assertThrows(IllegalStateException.class, fixture::verify);
        assertTrue(error.getMessage().contains("not allowlisted"));
    }

    @Test
    void verificationIsRepeatableAndReportsStableMarker() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(startsWith("select current_database"), eq(String.class))).thenReturn("demo/db");
        when(jdbc.queryForObject(startsWith("select count(*)"), eq(Long.class), eq(DemoDataService.MARKER)))
                .thenReturn(17L);
        DemoDataService fixture = new DemoDataService(jdbc, mock(PasswordEncoder.class),
                mock(LocationRepository.class), mock(PartnerRepository.class), mock(PartnerLocationRepository.class),
                mock(UserRepository.class), mock(UserLocationAccessRepository.class), mock(CategoryRepository.class),
                mock(ProductRepository.class), mock(MenuRepository.class), mock(VendorRepository.class),
                mock(LocationProductRepository.class), mock(ProductInventoryRepository.class),
                mock(OrderRepository.class), mock(OrderItemRepository.class), "demo/db", "dev", true);
        assertEquals(fixture.verify(), fixture.verify());
        assertEquals(DemoDataService.MARKER, fixture.verify().get("marker"));
        verify(jdbc, times(3)).execute(anyString());
    }
}
