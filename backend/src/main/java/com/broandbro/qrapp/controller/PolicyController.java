package com.broandbro.qrapp.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PolicyController {

    @GetMapping("/terms-and-conditions")
    public String termsAndConditions() {
        return "policies/terms-and-conditions";
    }

    @GetMapping("/privacy-policy")
    public String privacyPolicy() {
        return "policies/privacy-policy";
    }

    @GetMapping("/refund-policy")
    public String refundPolicy() {
        return "policies/refund-policy";
    }

    @GetMapping("/return-policy")
    public String returnPolicy() {
        return "policies/return-policy";
    }

    @GetMapping("/shipping-policy")
    public String shippingPolicy() {
        return "policies/shipping-policy";
    }
}