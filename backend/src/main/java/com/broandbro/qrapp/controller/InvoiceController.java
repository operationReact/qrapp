package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.repository.*;
import com.broandbro.qrapp.service.InvoiceService;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class InvoiceController {
    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final InvoiceService invoiceService;
    private final UserService userService;
    private final LocationAccessService locationAccessService;

    @GetMapping("/orders/{orderId}/invoice")
    public ResponseEntity<ByteArrayResource> customerInvoice(@PathVariable Long orderId, Authentication authentication) {
        User user = currentUser(authentication);
        Order order = orderRepository.findByIdWithLocation(orderId).orElseThrow();
        if (user == null || (!java.util.Objects.equals(order.getUserId(), user.getId())
                && !java.util.Objects.equals(order.getPhone(), user.getPhone()))) {
            throw new AccessDeniedException("Invoice access denied");
        }
        return pdf(order);
    }

    @GetMapping("/admin/orders/{orderId}/invoice")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<ByteArrayResource> adminInvoice(@PathVariable Long orderId, Authentication authentication) {
        Order order = orderRepository.findByIdWithLocation(orderId).orElseThrow();
        User user = currentUser(authentication);
        if (user == null || order.getLocation() == null) {
            throw new AccessDeniedException("Invoice access denied");
        }
        locationAccessService.requireLocationAccess(user, order.getLocation().getId());
        return pdf(order);
    }

    private ResponseEntity<ByteArrayResource> pdf(Order order) {
        Invoice invoice = invoiceRepository.findByOrderId(order.getId())
                .orElseGet(() -> invoiceService.createIfAbsent(order));
        byte[] bytes = invoiceService.renderPdf(invoice, order,
                orderItemRepository.findAllByOrderIdIn(List.of(order.getId())));
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"BroAndBro-Invoice-" + invoice.getInvoiceNumber().replace('/', '-') + ".pdf\"")
                .contentLength(bytes.length)
                .body(new ByteArrayResource(bytes));
    }

    private User currentUser(Authentication authentication) {
        return authentication == null ? null : userService.findByPhone(authentication.getName()).orElse(null);
    }
}
