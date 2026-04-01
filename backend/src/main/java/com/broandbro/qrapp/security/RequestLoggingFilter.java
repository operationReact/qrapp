package com.broandbro.qrapp.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;

@Component
public class RequestLoggingFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        String method = request.getMethod();
        String addr = request.getRemoteAddr();
        String auth = request.getHeader("Authorization");
        System.out.println(String.format("[REQ] %s %s from=%s auth=%s time=%s", method, uri, addr, (auth != null ? "present" : "none"), Instant.now()));
        filterChain.doFilter(request, response);
    }
}

