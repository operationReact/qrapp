package com.broandbro.qrapp.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Configures a dedicated WebClient bean for OpenAI API communication
 * with explicit connect and read timeouts.
 */
@Configuration
public class WebClientConfig {

    @Bean("openAiWebClient")
    public WebClient openAiWebClient(OpenAiProperties props) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, props.getConnectTimeoutMs())
                .responseTimeout(Duration.ofSeconds(props.getReadTimeoutSeconds()))
                .doOnConnected(conn ->
                        conn.addHandlerLast(new ReadTimeoutHandler(
                                props.getReadTimeoutSeconds(), TimeUnit.SECONDS)));

        // gpt-image-1 returns a base64-encoded image inline in the JSON body.
        // A 1024×1024 image is ~1.3 MB as base64, well above the default 256 KB codec limit.
        // Raise the in-memory buffer to 10 MB to prevent DataBufferLimitException.
        ExchangeStrategies exchangeStrategies = ExchangeStrategies.builder()
                .codecs(codecs -> codecs.defaultCodecs().maxInMemorySize(10 * 1024 * 1024)) // 10 MB
                .build();

        return WebClient.builder()
                .baseUrl(props.getBaseUrl())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + props.getApiKey())
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .exchangeStrategies(exchangeStrategies)
                .build();
    }
}

