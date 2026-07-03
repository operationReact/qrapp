package com.broandbro.qrapp.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    private static final String BEARER_SCHEME = "bearerAuth";
    private static final String BASIC_SCHEME  = "basicAuth";

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("BroAndBro QR App API")
                        .description("REST API documentation for the BroAndBro QR ordering application")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("BroAndBro Team")))
                .addSecurityItem(new SecurityRequirement()
                        .addList(BEARER_SCHEME)
                        .addList(BASIC_SCHEME))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME,
                                new SecurityScheme()
                                        .name(BEARER_SCHEME)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("Token")
                                        .description("Enter the token obtained from /auth/login"))
                        .addSecuritySchemes(BASIC_SCHEME,
                                new SecurityScheme()
                                        .name(BASIC_SCHEME)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("basic")
                                        .description("Admin basic authentication")));
    }
}

