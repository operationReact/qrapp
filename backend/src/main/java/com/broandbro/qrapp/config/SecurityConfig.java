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
                                "/auth/login",
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

                        .requestMatchers(
                                HttpMethod.POST,
                                "/menu"
                        ).hasRole("ADMIN")

                        .requestMatchers("/admin/**")
                        .hasRole("ADMIN")

                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")

                        // All analytics endpoints — admin only
                        .requestMatchers("/api/v1/analytics/**")
                        .hasRole("ADMIN")

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

                .addFilterBefore(
                        tokenAuthFilter,
                        BasicAuthenticationFilter.class
                )

                .httpBasic(AbstractHttpConfigurer::disable)

                .formLogin(AbstractHttpConfigurer::disable);

        return http.build();
    }
}
