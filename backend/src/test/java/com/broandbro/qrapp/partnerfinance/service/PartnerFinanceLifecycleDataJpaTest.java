package com.broandbro.qrapp.partnerfinance.service;

import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.partnerfinance.dto.AgreementDtos.CreateAgreementRequest;
import com.broandbro.qrapp.partnerfinance.dto.SettlementDtos.*;
import com.broandbro.qrapp.partnerfinance.engine.CommissionEngine;
import com.broandbro.qrapp.partnerfinance.engine.FinanceClock;
import com.broandbro.qrapp.partnerfinance.engine.UnavailableSettlementRefundSource;
import com.broandbro.qrapp.partnerfinance.enums.AdjustmentType;
import com.broandbro.qrapp.partnerfinance.enums.CommissionBasis;
import com.broandbro.qrapp.partnerfinance.enums.SettlementStatus;
import com.broandbro.qrapp.partnerfinance.exception.PartnerFinanceException;
import com.broandbro.qrapp.partnernotification.PartnerNotificationDtos.NotificationResponse;
import com.broandbro.qrapp.partnernotification.PartnerNotificationService;
import com.broandbro.qrapp.partnernotification.PartnerNotificationType;
import com.broandbro.qrapp.service.PartnerAccessService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.security.core.Authentication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** End-to-end lifecycle on real repositories (H2): agreement -> generate -> adjust -> approve -> paid. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({PartnerSettlementService.class, PartnerAgreementService.class, SettlementCalculator.class,
        CommissionEngine.class, UnavailableSettlementRefundSource.class, FinanceAuditService.class,
        SettlementStatementPdfService.class, PartnerNotificationService.class,
        PartnerFinanceLifecycleDataJpaTest.Config.class})
class PartnerFinanceLifecycleDataJpaTest {

    @TestConfiguration
    static class Config {
        @Bean
        @Primary
        FinanceClock testClock() {
            return new FinanceClock(Clock.fixed(Instant.parse("2026-10-08T22:30:00Z"), ZoneId.of("UTC")));
        }
    }

    @Autowired EntityManager em;
    @Autowired PartnerSettlementService settlements;
    @Autowired PartnerAgreementService agreements;
    @Autowired PartnerNotificationService notifications;
    @MockBean PartnerAccessService access;

    private final Authentication admin = mock(Authentication.class);
    private final Authentication superAdmin = mock(Authentication.class);
    private final Authentication outsider = mock(Authentication.class);
    private final Authentication member = mock(Authentication.class);
    private Partner partner;
    private Partner otherPartner;
    private Location location;

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    private Partner newPartner(String code) {
        Partner p = Partner.builder().partnerCode(code).legalName(code + " LLP").displayName(code)
                .primaryContactName("c").primaryContactEmail("c@x.com").primaryContactPhone("9").build();
        em.persist(p);
        return p;
    }

    private User newUser(String phone, UserRole role) {
        User u = User.builder().name(phone).phone(phone).password("x").role(role).build();
        em.persist(u);
        return u;
    }

    private PartnerUser link(Partner p, User u) {
        PartnerUser link = PartnerUser.builder().partner(p).user(u).build();
        em.persist(link);
        return link;
    }

    private void order(LocalDateTime at, String subtotal, String discount, String tax, String total, boolean pre, String pay) {
        Order o = new Order();
        o.setLocation(location);
        o.setStatus(OrderStatus.COMPLETED);
        o.setCompletedAt(at);
        o.setSubtotal(bd(subtotal));
        o.setCouponDiscount(bd(discount));
        o.setTax(bd(tax));
        o.setGrandTotal(bd(total));
        o.setPreOrder(pre);
        o.setPaymentStatus(pay);
        o.setPaymentMethod(PaymentMethod.RAZORPAY);
        o.setOrderNumber("O-" + System.nanoTime());
        em.persist(o);
    }

    @BeforeEach
    void setUp() {
        partner = newPartner("P1");
        otherPartner = newPartner("P2");
        location = Location.builder().code("LOC1").name("Food Court").build();
        em.persist(location);
        em.persist(PartnerLocation.builder().partner(partner).location(location)
                .status(PartnerRelationshipStatus.ACTIVE).relationshipType(PartnerRelationshipType.PRIMARY).build());
        User adminUser = newUser("9100000001", UserRole.PARTNER_ADMIN);
        User root = newUser("9100000002", UserRole.SUPER_ADMIN);
        User outsiderUser = newUser("9100000003", UserRole.PARTNER_ADMIN);
        User memberUser = newUser("9100000004", UserRole.PARTNER_USER);
        PartnerUser adminLink = link(partner, adminUser);
        PartnerUser memberLink = link(partner, memberUser);
        PartnerUser outsiderLink = link(otherPartner, outsiderUser);
        em.flush();
        when(access.getCurrentPartner(admin)).thenReturn(partner);
        when(access.currentAssociation(admin)).thenReturn(adminLink);
        when(access.currentAssociation(member)).thenReturn(memberLink);
        when(access.currentUser(superAdmin)).thenReturn(root);
        when(access.getCurrentPartner(outsider)).thenReturn(otherPartner);
        when(access.currentAssociation(outsider)).thenReturn(outsiderLink);
    }

    @Test
    void fullLifecycleProducesAuditedImmutableResults() {
        agreements.create(partner.getId(), new CreateAgreementRequest(null, CommissionBasis.NET_SALES, bd("10"),
                LocalDate.of(2026, 1, 1), null, null, null), superAdmin);
        order(LocalDateTime.of(2026, 9, 2, 10, 0), "500.00", "50.00", "21.43", "450.00", false, "PAID");
        order(LocalDateTime.of(2026, 9, 30, 23, 59), "200.00", "0.00", "9.52", "200.00", true, "PAID");
        order(LocalDateTime.of(2026, 10, 1, 0, 0), "999.00", "0.00", "0.00", "999.00", false, "PAID");
        em.flush();

        SettlementDetailResponse created = settlements.generate(admin, new GenerateSettlementRequest("2026-09", true));
        SettlementResponse s = created.settlement();
        assertEquals(SettlementStatus.CALCULATED, s.status());
        assertEquals(2, s.orderCount());
        assertEquals(1, s.eligibleOrderCount());
        assertEquals(bd("700.00"), s.grossSales());
        assertEquals(bd("50.00"), s.discountTotal());
        assertEquals(bd("30.95"), s.taxTotal());
        assertEquals(bd("619.05"), s.netSales());
        assertEquals(bd("428.57"), s.eligibleSales());
        assertEquals(bd("61.91"), s.commissionAmount()); // 42.86 + 19.05 on net basis
        assertFalse(s.refundDataAvailable());

        assertEquals("settlement_already_exists_for_period", assertThrows(PartnerFinanceException.class,
                () -> settlements.generate(admin, new GenerateSettlementRequest("2026-09", true))).getCode());

        SettlementDetailResponse adjusted = settlements.addAdjustment(admin, s.id(),
                new AdjustmentRequest(AdjustmentType.MANUAL_DEBIT, bd("1.91"), "Rounding correction"));
        assertEquals(bd("60.00"), adjusted.settlement().netPayable());
        assertEquals(1, adjusted.adjustments().size());
        assertEquals(bd("-1.91"), adjusted.adjustments().get(0).amount());

        // New order arrives late: recalculation picks it up while still open; approval would have been stale.
        order(LocalDateTime.of(2026, 9, 15, 10, 0), "100.00", "0.00", "0.00", "100.00", false, "PAID");
        em.flush();
        assertEquals("settlement_stale_recalculate_required", assertThrows(PartnerFinanceException.class,
                () -> settlements.approve(admin, s.id())).getCode());
        SettlementDetailResponse recalculated = settlements.recalculate(admin, s.id());
        assertEquals(3, recalculated.settlement().orderCount());
        assertEquals(bd("71.91"), recalculated.settlement().commissionAmount());
        assertEquals(bd("70.00"), recalculated.settlement().netPayable());

        SettlementDetailResponse approved = settlements.approve(admin, s.id());
        assertEquals(SettlementStatus.APPROVED, approved.settlement().status());
        assertEquals("9100000001", approved.settlement().approvedBy());
        assertEquals("settlement_not_open_for_adjustments", assertThrows(PartnerFinanceException.class,
                () -> settlements.addAdjustment(admin, s.id(),
                        new AdjustmentRequest(AdjustmentType.MANUAL_CREDIT, bd("1.00"), "late"))).getCode());

        SettlementDetailResponse paid = settlements.markPaid(admin, s.id(), new MarkPaidRequest("UTR-1", null, null));
        assertEquals(SettlementStatus.PAID, paid.settlement().status());
        assertEquals(LocalDate.of(2026, 10, 9), paid.settlement().paidOn());

        var audit = settlements.auditTrail(admin, s.id());
        assertEquals(java.util.List.of("CREATED", "CALCULATED", "ADJUSTMENT_ADDED", "RECALCULATED", "APPROVED", "PAID"),
                audit.stream().map(a -> a.action()).toList());
        assertTrue(audit.stream().allMatch(a -> a.actorName() != null));

        byte[] pdf = settlements.statement(admin, s.id()).content();
        assertTrue(pdf.length > 1000);
        assertEquals(1, settlements.list(admin, SettlementStatus.PAID, 0, 10).getTotalElements());
        assertEquals(3, settlements.lineItems(admin, s.id(), null, 0, 10).getTotalElements());
    }

    @Test
    void anotherPartnerCannotSeeOrChangeTheSettlement() {
        agreements.create(partner.getId(), new CreateAgreementRequest(null, CommissionBasis.GROSS_SALES, bd("5"),
                LocalDate.of(2026, 1, 1), null, null, null), superAdmin);
        order(LocalDateTime.of(2026, 9, 2, 10, 0), "100.00", "0.00", "0.00", "100.00", false, "PAID");
        em.flush();
        Long id = settlements.generate(admin, new GenerateSettlementRequest("2026-09", true)).settlement().id();

        assertEquals("settlement_not_found", assertThrows(PartnerFinanceException.class,
                () -> settlements.detail(outsider, id)).getCode());
        assertThrows(PartnerFinanceException.class, () -> settlements.approve(outsider, id));
        assertThrows(PartnerFinanceException.class, () -> settlements.voidSettlement(outsider, id, new ReasonRequest("nope")));
        assertThrows(PartnerFinanceException.class, () -> settlements.statement(outsider, id));
        assertEquals(0, settlements.list(outsider, null, 0, 10).getTotalElements());
        assertEquals(SettlementStatus.CALCULATED, settlements.detail(admin, id).settlement().status());
    }

    @Test
    void voidedSettlementAllowsRegenerationForThePeriod() {
        agreements.create(partner.getId(), new CreateAgreementRequest(null, CommissionBasis.GROSS_SALES, bd("5"),
                LocalDate.of(2026, 1, 1), null, null, null), superAdmin);
        em.flush();
        Long id = settlements.generate(admin, new GenerateSettlementRequest("2026-09", true)).settlement().id();
        assertEquals(0, settlements.detail(admin, id).settlement().orderCount());
        settlements.voidSettlement(admin, id, new ReasonRequest("Generated by mistake"));
        Long second = settlements.generate(admin, new GenerateSettlementRequest("2026-09", false)).settlement().id();
        assertNotEquals(id, second);
        assertEquals(SettlementStatus.DRAFT, settlements.detail(admin, second).settlement().status());
    }

    @Test
    void generationRequiresAnAgreementCoveringSomeDayInTheMonth() {
        agreements.create(partner.getId(), new CreateAgreementRequest(null, CommissionBasis.GROSS_SALES, bd("5"),
                LocalDate.of(2026, 10, 1), null, null, null), superAdmin);
        em.flush();
        assertEquals("no_commission_agreement_for_period", assertThrows(PartnerFinanceException.class,
                () -> settlements.generate(admin, new GenerateSettlementRequest("2026-09", true))).getCode());
    }

    @Test
    void settlementEventsRaiseIdempotentPerUserNotificationsWithoutTouchingFinancials() {
        agreements.create(partner.getId(), new CreateAgreementRequest(null, CommissionBasis.NET_SALES, bd("10"),
                LocalDate.of(2026, 1, 1), null, null, null), superAdmin);
        order(LocalDateTime.of(2026, 9, 2, 10, 0), "500.00", "50.00", "21.43", "450.00", false, "PAID");
        em.flush();
        assertEquals(0, notifications.unreadCount(admin).unread());

        SettlementResponse s = settlements.generate(admin, new GenerateSettlementRequest("2026-09", true)).settlement();
        settlements.addAdjustment(admin, s.id(), new AdjustmentRequest(AdjustmentType.MANUAL_CREDIT, bd("1.00"), "bonus"));
        settlements.recalculate(admin, s.id());
        assertEquals(2, notifications.unreadCount(admin).unread()); // CREATED + CALCULATED only
        settlements.approve(admin, s.id());
        settlements.markPaid(admin, s.id(), new MarkPaidRequest("UTR-9", null, null));

        var page = notifications.list(admin, false, 0, 20);
        assertEquals(4, page.getTotalElements());
        assertEquals(java.util.Set.of(PartnerNotificationType.SETTLEMENT_CREATED, PartnerNotificationType.SETTLEMENT_CALCULATED,
                        PartnerNotificationType.SETTLEMENT_APPROVED, PartnerNotificationType.SETTLEMENT_PAID),
                page.getContent().stream().map(NotificationResponse::eventType).collect(java.util.stream.Collectors.toSet()));
        assertTrue(page.getContent().stream().allMatch(n -> ("/partner/finance/settlements/" + s.id()).equals(n.targetPath())));
        assertEquals(4, notifications.list(member, false, 0, 20).getTotalElements());
        assertEquals(0, notifications.list(outsider, false, 0, 20).getTotalElements());

        // Re-emitting an event is a no-op (idempotent by event key).
        notifications.notifySettlementEvent(partner.getId(), s.id(), "PAID");
        notifications.notifySettlementEvent(partner.getId(), s.id(), "ADJUSTMENT_ADDED");
        notifications.notifySettlementEvent(partner.getId(), s.id(), "VOIDED");
        assertEquals(4, notifications.unreadCount(admin).unread());

        SettlementResponse before = settlements.detail(admin, s.id()).settlement();
        Long firstId = page.getContent().get(0).id();
        assertTrue(notifications.markRead(admin, firstId).read());
        assertTrue(notifications.markRead(admin, firstId).read());
        assertEquals(3, notifications.unreadCount(admin).unread());
        assertEquals(4, notifications.unreadCount(member).unread());
        assertEquals(1, notifications.list(admin, false, 0, 20).getContent().stream()
                .filter(NotificationResponse::read).count());
        assertEquals(3, notifications.list(admin, true, 0, 20).getTotalElements());

        assertEquals("notification_not_found", assertThrows(
                com.broandbro.qrapp.partnerportal.PartnerPortalException.class,
                () -> notifications.markRead(outsider, firstId)).getCode());
        assertEquals("notification_not_found", assertThrows(
                com.broandbro.qrapp.partnerportal.PartnerPortalException.class,
                () -> notifications.markRead(member, firstId)).getCode());
        assertEquals(3, notifications.markAllRead(admin).updated());
        assertEquals(0, notifications.unreadCount(admin).unread());
        assertEquals(4, notifications.unreadCount(member).unread());

        SettlementResponse after = settlements.detail(admin, s.id()).settlement();
        assertEquals(before.netPayable(), after.netPayable());
        assertEquals(before.commissionAmount(), after.commissionAmount());
        assertEquals(java.util.List.of("CREATED", "CALCULATED", "ADJUSTMENT_ADDED", "RECALCULATED", "APPROVED", "PAID"),
                settlements.auditTrail(admin, s.id()).stream().map(a -> a.action()).toList());
    }

    @Test
    void inactivePartnerUsersAreNotNotified() {
        PartnerUser inactive = link(partner, newUser("9100000005", UserRole.PARTNER_USER));
        inactive.setActive(false);
        agreements.create(partner.getId(), new CreateAgreementRequest(null, CommissionBasis.GROSS_SALES, bd("5"),
                LocalDate.of(2026, 1, 1), null, null, null), superAdmin);
        em.flush();
        settlements.generate(admin, new GenerateSettlementRequest("2026-09", false));
        em.flush();
        long inactiveRows = em.createQuery("select count(n) from PartnerNotification n where n.partnerUserId = :id", Long.class)
                .setParameter("id", inactive.getId()).getSingleResult();
        assertEquals(0, inactiveRows);
        assertEquals(1, notifications.unreadCount(admin).unread());
    }}
