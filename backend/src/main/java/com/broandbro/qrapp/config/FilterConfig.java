package com.broandbro.qrapp.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class FilterConfig extends OncePerRequestFilter {

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {

        String path = request.getServletPath();

        return

                path.equals("/auth/login") ||
                        path.equals("/auth/register") ||
                        path.equals("/admin/login") ||

                        path.equals("/terms-and-conditions") ||
                        path.equals("/privacy-policy") ||
                        path.equals("/refund-policy") ||
                        path.equals("/return-policy") ||
                        path.equals("/shipping-policy") ||

                        path.startsWith("/uploads/") ||

                        path.startsWith("/webhook/") ||

                        path.equals("/menu") ||

                        path.startsWith("/menu/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String token = request.getHeader("X-ADMIN-TOKEN");

        if (token == null || token.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        if ("admin-token".equals(token)) {

            var auth = new UsernamePasswordAuthenticationToken(
                    "admin",
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
            );

            SecurityContextHolder
                    .getContext()
                    .setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}