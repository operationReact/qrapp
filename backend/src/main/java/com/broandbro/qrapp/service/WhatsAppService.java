package com.broandbro.qrapp.service;

import org.springframework.stereotype.Service;

@Service
public class WhatsAppService {

    public void sendOrderPlaced(String phone, Long orderId) {
        // integrate Twilio / Meta API here
        System.out.println("WhatsApp: Order placed " + orderId);
    }

    public void sendOrderReady(String phone, Long orderId) {
        System.out.println("WhatsApp: Order ready " + orderId);
    }
}