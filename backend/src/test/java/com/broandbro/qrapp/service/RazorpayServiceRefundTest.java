package com.broandbro.qrapp.service;

import com.broandbro.qrapp.config.RazorpayProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class RazorpayServiceRefundTest {

    private static final String BASE = "https://api.razorpay.test/v1";
    private static final String PAYMENT = "pay_1";
    private static final String KEY = "order-10-cancel";

    private MockRestServiceServer server;
    private RazorpayService service;

    @BeforeEach
    void setUp() {
        RazorpayProperties props = new RazorpayProperties();
        props.setKey("rzp_test_abcdef123456");
        props.setSecret("secretsecretsecret");
        RestTemplate restTemplate = new RestTemplate();
        server = MockRestServiceServer.bindTo(restTemplate).build();
        service = new RazorpayService(props, new MockEnvironment(), restTemplate, BASE);
    }

    @Test
    void badRequestAboutIdempotencyKeyIsAmbiguousNotDefinite() {
        server.expect(requestTo(BASE + "/payments/" + PAYMENT + "/refund"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"description\":\"Different request with the same idempotency key has already been processed.\"}}"));

        RazorpayService.RefundException ex = assertThrows(RazorpayService.RefundException.class,
                () -> service.refundPayment(PAYMENT, 15000L, KEY));
        assertFalse(ex.isDefinite());
        server.verify();
    }

    @Test
    void fetchRefundReadsStatusPaymentAmountAndRefundKey() {
        server.expect(requestTo(BASE + "/payments/" + PAYMENT + "/refunds/rfnd_1"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("{\"id\":\"rfnd_1\",\"payment_id\":\"pay_1\",\"amount\":15000,"
                        + "\"status\":\"processed\",\"notes\":{\"refund_key\":\"" + KEY + "\"}}", MediaType.APPLICATION_JSON));

        RazorpayService.RefundDetail detail = service.fetchRefund(PAYMENT, "rfnd_1");

        assertEquals(new RazorpayService.RefundDetail("rfnd_1", PAYMENT, 15000L, "processed", KEY), detail);
        server.verify();
    }

    @Test
    void fetchRefundFailureIsNotDefiniteAndDoesNotReportAnOutcome() {
        server.expect(requestTo(BASE + "/payments/" + PAYMENT + "/refunds/rfnd_1"))
                .andRespond(withServerError());

        RazorpayService.RefundException ex = assertThrows(RazorpayService.RefundException.class,
                () -> service.fetchRefund(PAYMENT, "rfnd_1"));
        assertFalse(ex.isDefinite());
        server.verify();
    }

    @Test
    void fetchRefundWithoutAmountIsRejected() {
        server.expect(requestTo(BASE + "/payments/" + PAYMENT + "/refunds/rfnd_1"))
                .andRespond(withSuccess("{\"id\":\"rfnd_1\",\"payment_id\":\"pay_1\",\"status\":\"processed\"}",
                        MediaType.APPLICATION_JSON));

        assertThrows(RazorpayService.RefundException.class, () -> service.fetchRefund(PAYMENT, "rfnd_1"));
        server.verify();
    }

    @Test
    void refundSendsStableIdempotencyHeaderAndDeterministicBody() {
        server.expect(requestTo(BASE + "/payments/" + PAYMENT + "/refund"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(RazorpayService.REFUND_IDEMPOTENCY_HEADER, KEY))
                .andExpect(jsonPath("$.amount").value(15000))
                .andExpect(jsonPath("$.speed").value("normal"))
                .andExpect(jsonPath("$.notes.refund_key").value(KEY))
                .andRespond(withSuccess("{\"id\":\"rfnd_1\"}", MediaType.APPLICATION_JSON));

        assertEquals("rfnd_1", service.refundPayment(PAYMENT, 15000L, KEY));
        server.verify();
    }

    @Test
    void conflictFromRefundEndpointIsAmbiguousNotDefinite() {
        server.expect(requestTo(BASE + "/payments/" + PAYMENT + "/refund"))
                .andRespond(withStatus(HttpStatus.CONFLICT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"description\":\"refund request is still in progress\"}}"));

        RazorpayService.RefundException ex = assertThrows(RazorpayService.RefundException.class,
                () -> service.refundPayment(PAYMENT, 15000L, KEY));
        assertFalse(ex.isDefinite());
        server.verify();
    }

    @Test
    void badRequestFromRefundEndpointIsDefiniteRejection() {
        server.expect(requestTo(BASE + "/payments/" + PAYMENT + "/refund"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"description\":\"amount exceeds refundable balance\"}}"));

        RazorpayService.RefundException ex = assertThrows(RazorpayService.RefundException.class,
                () -> service.refundPayment(PAYMENT, 15000L, KEY));
        assertTrue(ex.isDefinite());
    }

    @Test
    void timeoutAfterRequestMayHaveReachedProviderIsAmbiguous() {
        server.expect(requestTo(BASE + "/payments/" + PAYMENT + "/refund"))
                .andRespond(withException(new IOException("read timed out")));

        RazorpayService.RefundException ex = assertThrows(RazorpayService.RefundException.class,
                () -> service.refundPayment(PAYMENT, 15000L, KEY));
        assertFalse(ex.isDefinite());
    }

    @Test
    void retryAfterTimeoutSendsSameKeyAndIdenticalBody() {
        String[] bodies = new String[2];
        for (int i = 0; i < 2; i++) {
            int attempt = i;
            server.expect(requestTo(BASE + "/payments/" + PAYMENT + "/refund"))
                    .andExpect(header(RazorpayService.REFUND_IDEMPOTENCY_HEADER, KEY))
                    .andExpect(request -> bodies[attempt] = ((MockClientHttpRequest) request).getBodyAsString())
                    .andRespond(attempt == 0
                            ? withException(new IOException("read timed out"))
                            : withSuccess("{\"id\":\"rfnd_1\"}", MediaType.APPLICATION_JSON));
        }

        assertThrows(RazorpayService.RefundException.class,
                () -> service.refundPayment(PAYMENT, 15000L, KEY));
        assertEquals("rfnd_1", service.refundPayment(PAYMENT, 15000L, KEY));
        server.verify();
        assertEquals(bodies[0], bodies[1]);
    }

    @Test
    void lookupFindsMatchingRefundOnSecondPage() {
        expectPage(0, 100, null);
        expectPage(100, 1, KEY, "rfnd_200");

        assertEquals(Optional.of("rfnd_200"), service.findRefundIdByKey(PAYMENT, KEY));
        server.verify();
    }

    @Test
    void shortPageFromServerCapDoesNotHideLaterMatch() {
        expectPage(0, 50, null);
        expectPage(50, 50, KEY, "rfnd_300");

        assertEquals(Optional.of("rfnd_300"), service.findRefundIdByKey(PAYMENT, KEY));
        server.verify();
    }

    @Test
    void lookupReturnsEmptyOnlyAfterEmptyPage() {
        expectPage(0, 100, null);
        expectPage(100, 0, null);

        assertEquals(Optional.empty(), service.findRefundIdByKey(PAYMENT, KEY));
        server.verify();
    }

    @Test
    void findRefundByKeyReportsFailedStatusSoCallersCanDistinguishIt() {
        String body = "{\"entity\":\"collection\",\"count\":1,\"items\":[{\"id\":\"rfnd_fail\",\"status\":\"failed\","
                + "\"notes\":{\"refund_key\":\"" + KEY + "\"}}]}";
        server.expect(requestTo(BASE + "/payments/" + PAYMENT + "/refunds?count=100&skip=0"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));

        assertEquals(Optional.of(new RazorpayService.ProviderRefund("rfnd_fail", "failed")),
                service.findRefundByKey(PAYMENT, KEY));
        server.verify();
    }

    @Test
    void failedLaterPageIsUnresolvedNotAbsent() {
        expectPage(0, 100, null);
        server.expect(requestTo(BASE + "/payments/" + PAYMENT + "/refunds?count=100&skip=100"))
                .andRespond(withServerError());

        assertThrows(IllegalStateException.class, () -> service.findRefundIdByKey(PAYMENT, KEY));
        server.verify();
    }

    @Test
    void responseWithoutItemsListIsUnresolved() {
        server.expect(requestTo(BASE + "/payments/" + PAYMENT + "/refunds?count=100&skip=0"))
                .andRespond(withSuccess("{\"entity\":\"collection\",\"count\":0}", MediaType.APPLICATION_JSON));

        assertThrows(IllegalStateException.class, () -> service.findRefundIdByKey(PAYMENT, KEY));
    }

    @Test
    void lookupBeyondPageCapIsUnresolved() {
        for (int page = 0; page < RazorpayService.REFUND_LOOKUP_MAX_PAGES; page++) {
            expectPage(page * 100, 100, null);
        }

        assertThrows(IllegalStateException.class, () -> service.findRefundIdByKey(PAYMENT, KEY));
        server.verify();
    }

    /** Expects one refund-list page; {@code matchKey} (if non-null) is placed in the last item with id {@code matchId}. */
    private void expectPage(int skip, int count, String matchKey, String... matchId) {
        List<String> items = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            boolean match = matchKey != null && i == count - 1;
            String key = match ? matchKey : "other_" + skip + "_" + i;
            String id = match ? matchId[0] : "rfnd_" + skip + "_" + i;
            items.add("{\"id\":\"" + id + "\",\"status\":\"processed\",\"notes\":{\"refund_key\":\"" + key + "\"}}");
        }
        String body = "{\"entity\":\"collection\",\"count\":" + count + ",\"items\":[" + String.join(",", items) + "]}";
        server.expect(requestTo(BASE + "/payments/" + PAYMENT + "/refunds?count=100&skip=" + skip))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }
}
