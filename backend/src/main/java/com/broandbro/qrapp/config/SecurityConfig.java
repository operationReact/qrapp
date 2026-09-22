package com.broandbro.qrapp.config;

import com.broandbro.qrapp.security.TokenAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.password:123}")
    private String adminPassword;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService users(PasswordEncoder passwordEncoder) {

        var admin = User.builder()
                .username(adminUsername)
                .password(passwordEncoder.encode(adminPassword))
                .roles("ADMIN")
                .build();

        return new InMemoryUserDetailsManager(admin);
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authenticationConfiguration
    ) throws Exception {

        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            TokenAuthFilter tokenAuthFilter,
            CorsConfigurationSource corsConfigurationSource
    ) throws Exception {

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(
                                HttpMethod.POST,
                                "/auth/register",
                                "/auth/register/request-otp",
                                "/auth/register/verify-otp",
                                "/auth/login",
                                "/auth/password/forgot/request-otp",
                                "/auth/password/forgot/verify-otp",
                                "/auth/password/reset",
                                "/auth/send-otp",
                                "/auth/verify-otp",
                                "/whatsapp/send",
                                "/whatsapp/verify-otp",
                                "/admin/login"
                        ).permitAll()

                        .requestMatchers(
                                "/terms-and-conditions",
                                "/privacy-policy",
                                "/refund-policy",
                                "/return-policy",
                                "/shipping-policy"
                        ).permitAll()

                        .requestMatchers("/uploads/**").permitAll()

                        // Swagger / OpenAPI
                        .requestMatchers(
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/v3/api-docs",
                                "/v3/api-docs/**"
                        ).permitAll()

                        .requestMatchers("/webhook/**").permitAll()

                        .requestMatchers(HttpMethod.GET, "/webhooks/whatsapp").permitAll()
                        .requestMatchers(HttpMethod.POST, "/webhooks/whatsapp").permitAll()

                        .requestMatchers("/admin/menu/bulk-upload/**").permitAll()

                        .requestMatchers(
                                HttpMethod.GET,
                                "/menu",
                                "/menu/**",
                                "/categories/**",
                                "/api/combos",
                                "/api/combo-campaigns",
                                "/orders/pre-order/items"
                        ).permitAll()

                        // BYOC cart evaluation — publicly accessible (no auth needed)
                        .requestMatchers(HttpMethod.POST, "/api/combo-campaigns/evaluate").permitAll()

                        // Recommendation: cart suggestions, complete-meal, and interaction tracking
                        // are all public (no customer login required). The analytics endpoint is
                        // protected at the controller level via @PreAuthorize.
                        .requestMatchers(HttpMethod.GET,  "/api/recommendations/cart").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/recommendations/cart").permitAll()
                        .requestMatchers(HttpMethod.GET,  "/api/recommendations/complete-meal").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/recommendations/interactions").permitAll()

                        .requestMatchers(
                                HttpMethod.POST,
                                "/menu"
                        ).hasAnyRole("ADMIN", "SUPERUSER", "SUPER_ADMIN", "MANAGER")

                        // Kitchen Queue — the only admin surface KITCHEN_STAFF may reach.
                        // These specific matchers must precede the generic /admin/** rule.
                        .requestMatchers(HttpMethod.GET, "/admin/orders/live")
                        .hasAnyRole("ADMIN", "SUPERUSER", "SUPER_ADMIN", "MANAGER", "KITCHEN_STAFF")
                        .requestMatchers(HttpMethod.PATCH, "/admin/orders/*/status")
                        .hasAnyRole("ADMIN", "SUPERUSER", "SUPER_ADMIN", "MANAGER", "KITCHEN_STAFF")

                        .requestMatchers("/admin/**")
                        .hasAnyRole("ADMIN", "SUPERUSER", "SUPER_ADMIN", "MANAGER")

                        .requestMatchers("/api/admin/**")
                        .hasAnyRole("ADMIN", "SUPERUSER", "SUPER_ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/locations/public").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/locations/*/customer-companies").permitAll()
                        .requestMatchers("/api/locations/**").authenticated()

                        // All analytics endpoints — admin console roles. Must mirror
                        // the controller @PreAuthorize (ADMIN, SUPERUSER, SUPER_ADMIN,
                        // MANAGER); per-location scoping is enforced in the controllers
                        // via LocationAccessService so SUPER_ADMIN/MANAGER aren't blocked
                        // here at the URL layer.
                        .requestMatchers("/api/v1/analytics/**")
                        .hasAnyRole("ADMIN", "SUPERUSER", "SUPER_ADMIN", "MANAGER")

                        // Allow wallet endpoints to pass through (controller will handle auth)
                        .requestMatchers("/api/wallet/**").permitAll()

                        // Party orders — user-facing (authentication enforced in controller)
                        .requestMatchers("/party-order/**").authenticated()

                        // Cache admin – no auth required
                        .requestMatchers("/api/cache/**").permitAll()
                        .requestMatchers("/admin/menu/bulk-upload/**").permitAll()

                        // Payment config — publicly readable (controls which methods are shown)
                        .requestMatchers(HttpMethod.GET, "/api/payment/**").permitAll()



                        .anyRequest()
                        .authenticated()
                )
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(new HttpStatusEntryPoint(org.springframework.http.HttpStatus.UNAUTHORIZED)))

                .addFilterBefore(
                        tokenAuthFilter,
                        BasicAuthenticationFilter.class
                )

                .httpBasic(AbstractHttpConfigurer::disable)

                .formLogin(AbstractHttpConfigurer::disable);

        return http.build();
    }
}
