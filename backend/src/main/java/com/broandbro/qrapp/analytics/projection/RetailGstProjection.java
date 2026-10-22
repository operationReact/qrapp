package com.broandbro.qrapp.analytics.projection;

import java.math.BigDecimal;

/** Live aggregate of completed order lines for MRP (retail) products and GST. */
public interface RetailGstProjection {
    BigDecimal getMrpSales();
    Long getMrpUnitsSold();
    BigDecimal getMrpGst();
    BigDecimal getTotalGst();
    BigDecimal getCgst();
    BigDecimal getSgst();
    BigDecimal getIgst();
}
