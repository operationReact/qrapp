package com.broandbro.qrapp.partnerfinance.repository;

import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.partnerfinance.engine.CommissionEngine;
import com.broandbro.qrapp.partnerfinance.engine.SettlementPeriod;
import com.broandbro.qrapp.partnerfinance.engine.UnavailableSettlementRefundSource;
import com.broandbro.qrapp.partnerfinance.entity.PartnerCommissionAgreement;
import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlement;
import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlementLineItem;
import com.broandbro.qrapp.partnerfinance.enums.CommissionBasis;
import com.broandbro.qrapp.partnerfinance.repository.PartnerSettlementLineItemRepository.LineTotals;
import com.broandbro.qrapp.partnerfinance.repository.SettlementOrderRepository.OrderRow;
import com.broandbro.qrapp.partnerfinance.repository.SettlementOrderRepository.OrderTotals;
import com.broandbro.qrapp.partnerfinance.service.SettlementCalculator;
import com.broandbro.qrapp.partnerfinance.service.SettlementTotals;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Runs the real JPQL against H2 to prove partner/location scoping, boundaries and DB-side aggregation. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class SettlementQueriesDataJpaTest {
    @Autowired EntityManager em;
    @Autowired SettlementOrderRepository orders;
    @Autowired PartnerSettlementLineItemRepository lineItems;

    private Partner mine;
    private Partner other;
    private Location myLocation;
    private Location otherLocation;
    private Location unlinked;
    private final SettlementPeriod september = SettlementPeriod.parse("2026-09");

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    private Partner partner(String code) {
        Partner p = Partner.builder().partnerCode(code).legalName(code).displayName(code).primaryContactName("c")
                .primaryContactEmail("c@x.com").primaryContactPhone("9").build();
        em.persist(p);
        return p;
    }

    private Location location(String code) {
        Location l = Location.builder().code(code).name(code).build();
        em.persist(l);
        return l;
    }

    private void link(Partner p, Location l, PartnerRelationshipStatus status, LocalDate from, LocalDate to) {
        em.persist(PartnerLocation.builder().partner(p).location(l).status(status)
                .relationshipType(PartnerRelationshipType.PRIMARY).effectiveFrom(from).effectiveTo(to).build());
    }

    private Order order(Location location, OrderStatus status, LocalDateTime completedAt, String subtotal,
                        String discount, String tax, String total, boolean preOrder, String payment) {
        Order o = new Order();
        o.setLocation(location);
        o.setStatus(status);
        o.setCompletedAt(completedAt);
        o.setSubtotal(bd(subtotal));
        o.setCouponDiscount(bd(discount));
        o.setTax(bd(tax));
        o.setGrandTotal(bd(total));
        o.setPreOrder(preOrder);
        o.setPaymentStatus(payment);
        o.setPaymentMethod(PaymentMethod.RAZORPAY);
        o.setOrderNumber("O-" + System.nanoTime());
        em.persist(o);
        return o;
    }

    @BeforeEach
    void data() {
        mine = partner("MINE");
        other = partner("OTHER");
        myLocation = location("L-MINE");
        otherLocation = location("L-OTHER");
        unlinked = location("L-NONE");
        link(mine, myLocation, PartnerRelationshipStatus.ACTIVE, null, null);
        link(other, otherLocation, PartnerRelationshipStatus.ACTIVE, null, null);
    }

    @Test
    void selectsOnlyCompletedOrdersInsideTheMonthForTheOwnPartnerLocations() {
        order(myLocation, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 1, 0, 0, 0), "100", "0", "0", "100", false, "PAID");
        order(myLocation, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 30, 23, 59, 59), "100", "0", "0", "100", false, "PAID");
        order(myLocation, OrderStatus.COMPLETED, LocalDateTime.of(2026, 8, 31, 23, 59, 59), "100", "0", "0", "100", false, "PAID");
        order(myLocation, OrderStatus.COMPLETED, LocalDateTime.of(2026, 10, 1, 0, 0, 0), "100", "0", "0", "100", false, "PAID");
        order(myLocation, OrderStatus.CANCELLED, LocalDateTime.of(2026, 9, 10, 10, 0), "100", "0", "0", "100", false, "PAID");
        order(myLocation, OrderStatus.PREPARING, LocalDateTime.of(2026, 9, 10, 10, 0), "100", "0", "0", "100", false, "PAID");
        order(myLocation, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 10, 10, 0), "100", "0", "0", "100", false, "FAILED");
        order(otherLocation, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 10, 10, 0), "999", "0", "0", "999", false, "PAID");
        order(unlinked, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 10, 10, 0), "999", "0", "0", "999", false, "PAID");
        em.flush();

        List<OrderRow> rows = orders.findOrderRows(mine.getId(), september.startDateTime(),
                september.endExclusiveDateTime(), PageRequest.of(0, 50)).getContent();

        assertEquals(2, rows.size());
        assertEquals(LocalDateTime.of(2026, 9, 1, 0, 0), rows.get(0).completedAt());
        assertEquals(LocalDateTime.of(2026, 9, 30, 23, 59, 59), rows.get(1).completedAt());
        assertTrue(rows.stream().allMatch(r -> r.locationId().equals(myLocation.getId())));

        OrderTotals totals = orders.totals(mine.getId(), september.startDateTime(), september.endExclusiveDateTime());
        assertEquals(2L, totals.orderCount());
        assertEquals(0, bd("200").compareTo(totals.grandTotal()));
    }

    @Test
    void inactiveAndDateWindowedPartnerLocationLinksAreRespected() {
        Location windowed = location("L-WINDOW");
        Location inactive = location("L-INACTIVE");
        link(mine, windowed, PartnerRelationshipStatus.ACTIVE, LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 20));
        link(mine, inactive, PartnerRelationshipStatus.INACTIVE, null, null);
        order(windowed, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 9, 23, 59), "10", "0", "0", "10", false, "PAID");
        order(windowed, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 10, 0, 0), "20", "0", "0", "20", false, "PAID");
        order(windowed, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 20, 23, 59), "30", "0", "0", "30", false, "PAID");
        order(windowed, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 21, 0, 0), "40", "0", "0", "40", false, "PAID");
        order(inactive, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 15, 0, 0), "50", "0", "0", "50", false, "PAID");
        em.flush();

        List<OrderRow> rows = orders.findOrderRows(mine.getId(), september.startDateTime(),
                september.endExclusiveDateTime(), PageRequest.of(0, 50)).getContent();

        assertEquals(List.of(bd("20"), bd("30")), rows.stream().map(r -> r.grandTotal().stripTrailingZeros()
                .setScale(0)).toList());
    }

    @Test
    void paginationWalksAllRowsWithoutDuplicatesOrGaps() {
        for (int i = 0; i < 7; i++) {
            order(myLocation, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 5, 10, i), "10", "0", "0", "10", false, "PAID");
        }
        em.flush();
        var first = orders.findOrderRows(mine.getId(), september.startDateTime(), september.endExclusiveDateTime(), PageRequest.of(0, 3));
        var second = orders.findOrderRows(mine.getId(), september.startDateTime(), september.endExclusiveDateTime(), first.nextPageable());
        var third = orders.findOrderRows(mine.getId(), september.startDateTime(), september.endExclusiveDateTime(), second.nextPageable());
        assertTrue(first.hasNext());
        assertTrue(second.hasNext());
        assertFalse(third.hasNext());
        assertEquals(7, first.getNumberOfElements() + second.getNumberOfElements() + third.getNumberOfElements());
    }

    @Test
    void persistedLineItemAggregatesMatchTheInMemoryTotals() {
        order(myLocation, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 2, 10, 0), "500.00", "50.00", "21.43", "450.00", false, "PAID");
        order(myLocation, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 3, 10, 0), "200.00", "0.00", "9.52", "200.00", true, "PAID");
        order(myLocation, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 4, 10, 0), "0.05", "0.00", "0.00", "0.05", false, "PAID");
        em.flush();
        PartnerCommissionAgreement agreement = PartnerCommissionAgreement.builder().partner(mine)
                .commissionBasis(CommissionBasis.ELIGIBLE_SALES).ratePercent(bd("10"))
                .effectiveFrom(LocalDate.of(2026, 1, 1)).build();
        em.persist(agreement);
        PartnerSettlement settlement = PartnerSettlement.builder().partner(mine).periodStart(september.start())
                .periodEnd(september.end()).partnerNameSnapshot("MINE").build();
        em.persist(settlement);

        SettlementCalculator calculator = new SettlementCalculator(orders, new CommissionEngine(),
                new UnavailableSettlementRefundSource());
        List<PartnerSettlementLineItem> built = calculator.calculate(mine.getId(), september, List.of(agreement), settlement.getId());
        lineItems.saveAll(built);
        lineItems.flush();
        em.clear();

        LineTotals db = lineItems.totals(settlement.getId());
        SettlementTotals mem = SettlementTotals.of(built);

        assertEquals(3L, db.orderCount());
        assertEquals(2L, db.eligibleOrderCount());
        assertEquals(0, mem.gross().compareTo(db.gross()));
        assertEquals(0, mem.tax().compareTo(db.tax()));
        assertEquals(0, mem.grandTotal().compareTo(db.grandTotal()));
        assertEquals(0, mem.net().compareTo(db.net()));
        assertEquals(0, mem.basis().compareTo(db.basis()));
        assertEquals(0, mem.commission().compareTo(db.commission()));
        assertEquals(0, mem.eligibleSales().compareTo(lineItems.eligibleNetSales(settlement.getId())));
        // eligible orders: 450-21.43=428.57 and 0.05 -> 42.857+0.005 => 42.86 + 0.01
        assertEquals(0, bd("42.87").compareTo(db.commission()));
    }

    @Test
    void deleteBySettlementRemovesOnlyThatSettlementsLines() {
        PartnerSettlement a = PartnerSettlement.builder().partner(mine).periodStart(september.start())
                .periodEnd(september.end()).partnerNameSnapshot("MINE").build();
        PartnerSettlement b = PartnerSettlement.builder().partner(other).periodStart(september.start())
                .periodEnd(september.end()).partnerNameSnapshot("OTHER").build();
        em.persist(a);
        em.persist(b);
        Order o = order(myLocation, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 2, 10, 0), "10", "0", "0", "10", false, "PAID");
        Order o2 = order(otherLocation, OrderStatus.COMPLETED, LocalDateTime.of(2026, 9, 2, 10, 0), "10", "0", "0", "10", false, "PAID");
        em.flush();
        BigDecimal v = bd("10.00");
        lineItems.save(line(a, mine, o, myLocation, v));
        lineItems.save(line(b, other, o2, otherLocation, v));
        lineItems.flush();

        assertEquals(1, lineItems.deleteBySettlementId(a.getId()));

        assertEquals(0L, lineItems.totals(a.getId()).orderCount());
        assertEquals(1L, lineItems.totals(b.getId()).orderCount());
    }

    private PartnerSettlementLineItem line(PartnerSettlement s, Partner p, Order o, Location l, BigDecimal v) {
        return PartnerSettlementLineItem.builder().settlementId(s.getId()).partnerId(p.getId()).orderId(o.getId())
                .locationId(l.getId()).completedAt(o.getCompletedAt()).grossAmount(v).discountAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO).grandTotal(v).refundAmount(BigDecimal.ZERO)
                .refundNetAmount(BigDecimal.ZERO).netAmount(v).eligible(true).basisAmount(v)
                .commissionAmount(BigDecimal.ONE).build();
    }
}