package com.broandbro.qrapp.partnerfinance.service;

import com.broandbro.qrapp.entity.Partner;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.UserRole;
import com.broandbro.qrapp.partnerfinance.dto.AgreementDtos.*;
import com.broandbro.qrapp.partnerfinance.engine.FinanceClock;
import com.broandbro.qrapp.partnerfinance.entity.PartnerCommissionAgreement;
import com.broandbro.qrapp.partnerfinance.enums.*;
import com.broandbro.qrapp.partnerfinance.exception.PartnerFinanceException;
import com.broandbro.qrapp.partnerfinance.repository.*;
import com.broandbro.qrapp.service.PartnerAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PartnerAgreementServiceTest {
    private final PartnerCommissionAgreementRepository agreements = mock(PartnerCommissionAgreementRepository.class);
    private final PartnerSettlementRepository settlements = mock(PartnerSettlementRepository.class);
    private final PartnerFinanceLockRepository partners = mock(PartnerFinanceLockRepository.class);
    private final PartnerAccessService access = mock(PartnerAccessService.class);
    private final FinanceAuditService audit = mock(FinanceAuditService.class);
    private final Authentication auth = mock(Authentication.class);
    private final FinanceClock clock = new FinanceClock(
            Clock.fixed(Instant.parse("2026-10-08T22:30:00Z"), ZoneId.of("UTC")));
    private final Partner partner = Partner.builder().id(5L).build();
    private PartnerAgreementService service;

    @BeforeEach
    void setUp() {
        service = new PartnerAgreementService(agreements, settlements, partners, access, audit, clock);
        when(access.currentUser(auth)).thenReturn(
                User.builder().id(1L).name("Root").phone("9").role(UserRole.SUPER_ADMIN).build());
        when(partners.lockPartner(5L)).thenReturn(Optional.of(partner));
        when(agreements.save(any())).thenAnswer(i -> {
            PartnerCommissionAgreement a = i.getArgument(0);
            if (a.getId() == null) a.setId(11L);
            return a;
        });
    }

    private static CreateAgreementRequest request(String from, String to) {
        return new CreateAgreementRequest(null, CommissionBasis.NET_SALES, new BigDecimal("12.5"),
                LocalDate.parse(from), to == null ? null : LocalDate.parse(to), null, "  note ");
    }

    private PartnerCommissionAgreement existing(long id, String from, String to) {
        return PartnerCommissionAgreement.builder().id(id).partner(partner).commissionType(CommissionType.PERCENTAGE)
                .commissionBasis(CommissionBasis.NET_SALES).ratePercent(new BigDecimal("10"))
                .effectiveFrom(LocalDate.parse(from)).effectiveTo(to == null ? null : LocalDate.parse(to))
                .taxTreatment(TaxTreatment.DEFERRED).status(AgreementStatus.ACTIVE).build();
    }

    @Test
    void createsAgreementWithDefaultsAndAuditsIt() {
        when(agreements.findByPartnerIdAndStatusOrderByEffectiveFromAscIdAsc(5L, AgreementStatus.ACTIVE)).thenReturn(List.of());

        AdminAgreementResponse r = service.create(5L, request("2026-01-01", null), auth);

        assertEquals(CommissionType.PERCENTAGE, r.commissionType());
        assertEquals(TaxTreatment.DEFERRED, r.taxTreatment());
        assertEquals("note", r.notes());
        assertEquals("Root", r.createdBy());
        verify(audit).record(eq(5L), eq(FinanceEntityType.AGREEMENT), eq(11L), eq("AGREEMENT_CREATED"), any(),
                isNull(), contains("rate=12.5"), isNull());
    }

    @Test
    void overlappingActiveAgreementsAreRejectedIncludingSingleDayOverlap() {
        when(agreements.findByPartnerIdAndStatusOrderByEffectiveFromAscIdAsc(5L, AgreementStatus.ACTIVE))
                .thenReturn(List.of(existing(1, "2026-01-01", "2026-06-30")));

        assertEquals("agreement_period_overlaps", assertThrows(PartnerFinanceException.class,
                () -> service.create(5L, request("2026-06-30", null), auth)).getCode());
        assertDoesNotThrow(() -> service.create(5L, request("2026-07-01", null), auth));
    }

    @Test
    void openEndedExistingAgreementBlocksLaterStarts() {
        when(agreements.findByPartnerIdAndStatusOrderByEffectiveFromAscIdAsc(5L, AgreementStatus.ACTIVE))
                .thenReturn(List.of(existing(1, "2026-01-01", null)));
        assertThrows(PartnerFinanceException.class, () -> service.create(5L, request("2030-01-01", null), auth));
    }

    @Test
    void endBeforeStartIsRejected() {
        assertEquals("agreement_end_before_start", assertThrows(PartnerFinanceException.class,
                () -> service.create(5L, request("2026-05-01", "2026-04-30"), auth)).getCode());
    }

    @Test
    void agreementCannotOverlapApprovedOrPaidSettlements() {
        when(agreements.findByPartnerIdAndStatusOrderByEffectiveFromAscIdAsc(5L, AgreementStatus.ACTIVE)).thenReturn(List.of());
        when(settlements.existsByPartnerIdAndStatusInAndPeriodStartLessThanEqualAndPeriodEndGreaterThanEqual(
                eq(5L), any(), any(), eq(LocalDate.of(2026, 8, 1)))).thenReturn(true);
        assertEquals("agreement_overlaps_finalised_settlement", assertThrows(PartnerFinanceException.class,
                () -> service.create(5L, request("2026-08-01", null), auth)).getCode());
    }

    @Test
    void endingMustShortenAndCannotCutIntoFinalisedSettlements() {
        PartnerCommissionAgreement a = existing(1, "2026-01-01", "2026-12-31");
        when(agreements.findByIdAndPartnerId(1L, 5L)).thenReturn(Optional.of(a));

        assertEquals("agreement_end_must_shorten", assertThrows(PartnerFinanceException.class,
                () -> service.end(5L, 1L, new EndAgreementRequest(LocalDate.of(2027, 1, 31), "extend"), auth)).getCode());
        assertEquals("agreement_end_before_start", assertThrows(PartnerFinanceException.class,
                () -> service.end(5L, 1L, new EndAgreementRequest(LocalDate.of(2025, 12, 31), "bad"), auth)).getCode());

        when(settlements.existsByPartnerIdAndStatusInAndPeriodStartLessThanEqualAndPeriodEndGreaterThanEqual(
                eq(5L), any(), eq(LocalDate.of(2026, 12, 31)), eq(LocalDate.of(2026, 9, 1)))).thenReturn(true);
        assertEquals("agreement_overlaps_finalised_settlement", assertThrows(PartnerFinanceException.class,
                () -> service.end(5L, 1L, new EndAgreementRequest(LocalDate.of(2026, 8, 31), "stop"), auth)).getCode());
    }

    @Test
    void endingShortensAndAudits() {
        PartnerCommissionAgreement a = existing(1, "2026-01-01", null);
        when(agreements.findByIdAndPartnerId(1L, 5L)).thenReturn(Optional.of(a));

        AdminAgreementResponse r = service.end(5L, 1L, new EndAgreementRequest(LocalDate.of(2026, 12, 31), "renegotiated"), auth);

        assertEquals(LocalDate.of(2026, 12, 31), r.effectiveTo());
        verify(audit).record(eq(5L), eq(FinanceEntityType.AGREEMENT), eq(1L), eq("AGREEMENT_ENDED"), any(),
                contains("to=open"), contains("to=2026-12-31"), eq("renegotiated"));
    }

    @Test
    void voidedAgreementNoLongerCoversAnyDate() {
        PartnerCommissionAgreement a = existing(1, "2026-01-01", null);
        when(agreements.findByIdAndPartnerId(1L, 5L)).thenReturn(Optional.of(a));
        service.voidAgreement(5L, 1L, new VoidAgreementRequest("created in error"), auth);
        assertEquals(AgreementStatus.VOID, a.getStatus());
        assertFalse(a.covers(LocalDate.of(2026, 5, 5)));
        assertEquals("agreement_not_active", assertThrows(PartnerFinanceException.class,
                () -> service.voidAgreement(5L, 1L, new VoidAgreementRequest("again"), auth)).getCode());
    }

    @Test
    void agreementBoundariesAreInclusive() {
        PartnerCommissionAgreement a = existing(1, "2026-09-15", "2026-09-30");
        assertFalse(a.covers(LocalDate.of(2026, 9, 14)));
        assertTrue(a.covers(LocalDate.of(2026, 9, 15)));
        assertTrue(a.covers(LocalDate.of(2026, 9, 30)));
        assertFalse(a.covers(LocalDate.of(2026, 10, 1)));
    }

    @Test
    void partnerViewHidesInternalNotes() {
        Partner current = Partner.builder().id(5L).build();
        when(access.getCurrentPartner(auth)).thenReturn(current);
        PartnerCommissionAgreement a = existing(1, "2026-01-01", null);
        a.setNotes("internal negotiation");
        when(agreements.findByPartnerIdOrderByEffectiveFromDescIdDesc(5L)).thenReturn(List.of(a));
        List<PartnerAgreementResponse> list = service.listForPartner(auth);
        assertEquals(1, list.size());
        assertTrue(list.get(0).currentlyEffective());
        assertFalse(java.util.Arrays.stream(PartnerAgreementResponse.class.getRecordComponents())
                .anyMatch(c -> c.getName().equals("notes") || c.getName().equals("createdBy")));
    }
}