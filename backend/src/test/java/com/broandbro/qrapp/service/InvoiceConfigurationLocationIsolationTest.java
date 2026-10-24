package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Invoice;
import com.broandbro.qrapp.entity.InvoiceConfiguration;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.OrderItem;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.repository.InvoiceRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.OrderItemRepository;
import com.broandbro.qrapp.storage.ImageStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceConfigurationGlobalTest {
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private OrderItemRepository orderItemRepository;
    @Mock
    private MenuRepository menuRepository;
    @Mock
    private TaxCalculationService taxCalculationService;
    @Mock
    private InvoiceConfigurationService configurationService;
    @Mock
    private ImageStorageService imageStorage;

    private InvoicePdfRenderer pdfRenderer;
    private InvoiceService invoiceService;

    @BeforeEach
    void setUp() {
        pdfRenderer = new InvoicePdfRenderer(imageStorage);
        invoiceService = new InvoiceService(invoiceRepository, orderItemRepository, menuRepository,
                taxCalculationService, configurationService, imageStorage, pdfRenderer);
    }

    @Test
    void invoiceUsesTheSharedConfigurationForAnyOrderLocation() {
        Order order = order(42L, 7L);
        InvoiceConfiguration globalConfig = InvoiceConfiguration.builder()
                .businessName("Shared Bro Foods")
                .invoiceNumberFormat("L7/{FY}/{SEQ}")
                .build();

        when(invoiceRepository.findByOrderId(42L)).thenReturn(Optional.empty());
        when(orderItemRepository.findAllByOrderIdIn(any())).thenReturn(java.util.List.of());
        when(configurationService.findGlobal()).thenReturn(globalConfig);
        when(invoiceRepository.nextNumber()).thenReturn(12L);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Invoice invoice = invoiceService.createIfAbsent(order);

        assertEquals("Shared Bro Foods", invoice.getSupplierName());
        assertEquals("L7/26-27/000012", invoice.getInvoiceNumber());
        verify(configurationService).findGlobal();
    }

    @Test
    void pdfContainsConfiguredBusinessFields() throws Exception {
        String text = renderConfiguredPdfText(InvoiceConfiguration.builder()
                .businessName("Configured Bro Foods")
                .tradeName("Configured Kitchen")
                .gstin("36CONFIGURED1234")
                .fssaiLicense("FSSAI-123")
                .showFssai(true)
                .pan("CONFIGPAN1")
                .showPan(true)
                .state("Telangana")
                .stateCode("36")
                .pincode("500090")
                .phone("+91 9000000000")
                .email("invoice@example.com")
                .website("www.example.com")
                .footerText("Configured footer")
                .build());

        org.junit.jupiter.api.Assertions.assertTrue(text.contains("Configured Bro Foods"));
        org.junit.jupiter.api.Assertions.assertTrue(text.contains("36CONFIGURED1234"));
        org.junit.jupiter.api.Assertions.assertTrue(text.contains("FSSAI: FSSAI-123"));
        org.junit.jupiter.api.Assertions.assertTrue(text.contains("PAN: CONFIGPAN1"));
        org.junit.jupiter.api.Assertions.assertTrue(text.contains("Configured footer"));
        org.junit.jupiter.api.Assertions.assertTrue(text.contains("Configured Biryani"));
    }

    @Test
    void pdfOmitsFssaiAndPanWhenDisabled() throws Exception {
        String text = renderConfiguredPdfText(InvoiceConfiguration.builder()
                .businessName("Configured Bro Foods")
                .gstin("36CONFIGURED1234")
                .fssaiLicense("FSSAI-123")
                .showFssai(false)
                .pan("CONFIGPAN1")
                .showPan(false)
                .footerText("Configured footer")
                .build());

        org.junit.jupiter.api.Assertions.assertTrue(text.contains("36CONFIGURED1234"));
        org.junit.jupiter.api.Assertions.assertFalse(text.contains("FSSAI"));
        org.junit.jupiter.api.Assertions.assertFalse(text.contains("FSSAI-123"));
        org.junit.jupiter.api.Assertions.assertFalse(text.contains("PAN:"));
        org.junit.jupiter.api.Assertions.assertFalse(text.contains("CONFIGPAN1"));
    }

    @Test
    void pdfOmitsFssaiAndPanLabelsWhenEnabledButValueMissing() throws Exception {
        String text = renderConfiguredPdfText(InvoiceConfiguration.builder()
                .businessName("Configured Bro Foods")
                .gstin("36CONFIGURED1234")
                .fssaiLicense("  ")
                .showFssai(true)
                .pan(null)
                .showPan(true)
                .footerText("Configured footer")
                .build());

        org.junit.jupiter.api.Assertions.assertTrue(text.contains("36CONFIGURED1234"));
        org.junit.jupiter.api.Assertions.assertFalse(text.contains("FSSAI"));
        org.junit.jupiter.api.Assertions.assertFalse(text.contains("PAN:"));
    }

    private String renderConfiguredPdfText(InvoiceConfiguration globalConfig) throws Exception {
        when(configurationService.findGlobal()).thenReturn(globalConfig);

        Invoice invoice = Invoice.builder()
                .invoiceNumber("BB/26-27/000001")
                .invoiceDate(java.time.LocalDate.of(2026, 10, 4))
                .customerName("Customer")
                .customerPhone("9000000000")
                .taxableAmount(new BigDecimal("100.00"))
                .cgstAmount(new BigDecimal("2.50"))
                .sgstAmount(new BigDecimal("2.50"))
                .igstAmount(BigDecimal.ZERO)
                .totalTax(new BigDecimal("5.00"))
                .grandTotal(new BigDecimal("105.00"))
                .paymentMethod("UPI")
                .build();

        OrderItem item = new OrderItem();
        item.setItemId(9L);
        item.setQuantity(1);
        item.setGstRate(new BigDecimal("5.00"));
        item.setTaxableAmount(new BigDecimal("100.00"));
        item.setTotalCustomerPrice(new BigDecimal("105.00"));
        MenuItem menuItem = new MenuItem();
        menuItem.setId(9L);
        menuItem.setName("Configured Biryani");
        when(menuRepository.findAllById(List.of(9L))).thenReturn(List.of(menuItem));

        byte[] pdf = invoiceService.renderPdf(invoice, new Order(), List.of(item));
        try (PDDocument document = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(document);
        }
    }

    private static Order order(Long orderId, Long locationId) {
        Order order = new Order();
        order.setId(orderId);
        order.setLocation(Location.builder().id(locationId).name("Test location").build());
        order.setGrandTotal(new BigDecimal("110.25"));
        return order;
    }
}
