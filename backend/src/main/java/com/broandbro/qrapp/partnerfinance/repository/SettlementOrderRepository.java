package com.broandbro.qrapp.partnerfinance.repository;

import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.enums.PaymentMethod;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Read-only access to the existing orders table for settlement generation. Population: COMPLETED orders
 * completed inside the window, at a location linked (ACTIVE, date-effective) to the partner, excluding
 * orders whose payment FAILED. Filtering happens in the database.
 */
public interface SettlementOrderRepository extends Repository<Order, Long> {

    String POPULATION = """
            FROM Order o JOIN o.location loc
            WHERE o.status = com.broandbro.qrapp.enums.OrderStatus.COMPLETED
              AND o.completedAt >= :from AND o.completedAt < :to
              AND (o.paymentStatus IS NULL OR UPPER(o.paymentStatus) <> 'FAILED')
              AND EXISTS (
                  SELECT 1 FROM PartnerLocation pl
                  WHERE pl.partner.id = :partnerId
                    AND pl.location.id = loc.id
                    AND pl.status = com.broandbro.qrapp.entity.PartnerRelationshipStatus.ACTIVE
                    AND (pl.effectiveFrom IS NULL OR pl.effectiveFrom <= CAST(o.completedAt AS LocalDate))
                    AND (pl.effectiveTo IS NULL OR pl.effectiveTo >= CAST(o.completedAt AS LocalDate)))
            """;

    @Query("SELECT new com.broandbro.qrapp.partnerfinance.repository.SettlementOrderRepository$OrderRow("
            + "o.id, o.orderNumber, loc.id, loc.code, loc.name, o.completedAt, o.subtotal, o.couponDiscount, "
            + "o.tax, o.grandTotal, o.preOrder, o.paymentStatus, o.paymentMethod) "
            + POPULATION + " ORDER BY o.completedAt ASC, o.id ASC")
    Slice<OrderRow> findOrderRows(@Param("partnerId") Long partnerId,
                                  @Param("from") LocalDateTime from,
                                  @Param("to") LocalDateTime to,
                                  Pageable pageable);

    @Query("SELECT new com.broandbro.qrapp.partnerfinance.repository.SettlementOrderRepository$OrderTotals("
            + "COUNT(o), COALESCE(SUM(o.grandTotal), 0), COALESCE(SUM(o.tax), 0)) "
            + POPULATION)
    OrderTotals totals(@Param("partnerId") Long partnerId,
                       @Param("from") LocalDateTime from,
                       @Param("to") LocalDateTime to);

    record OrderRow(Long orderId, String orderNumber, Long locationId, String locationCode, String locationName,
                    LocalDateTime completedAt, BigDecimal subtotal, BigDecimal couponDiscount, BigDecimal tax,
                    BigDecimal grandTotal, boolean preOrder, String paymentStatus, PaymentMethod paymentMethod) {
    }

    record OrderTotals(Long orderCount, BigDecimal grandTotal, BigDecimal tax) {
    }
}