package com.broandbro.qrapp.security;

import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.repository.UserLocationAccessRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import com.broandbro.qrapp.entity.UserRole;

@Slf4j
@Component
@RequiredArgsConstructor
public class TokenAuthFilter extends OncePerRequestFilter {
    private final UserService userService;
    private final UserLocationAccessRepository accessRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        log.debug("TokenAuthFilter processing request to: {} with auth header: {}", request.getRequestURI(), authHeader != null ? "present" : "missing");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();

            User u = userService.findByToken(token).orElse(null);
            if (u != null) {
                log.info("User found with token! Phone: {}, ID: {}, IsAdmin: {}, IsSuperUser: {}",
                    u.getPhone(), u.getId(), u.getIsAdmin(), u.getIsSuperUser());
                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                if (u.getIsAdmin()) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                }
                if (u.getIsSuperUser()) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_SUPERUSER"));
                }
                UserRole role = u.getRole();
                String locationHeader = request.getHeader("X-Location-Id");
                if (!Boolean.TRUE.equals(u.getIsSuperUser())
                        && locationHeader != null && locationHeader.matches("\\d+")) {
                    role = accessRepository.findByUserIdAndLocationId(u.getId(), Long.valueOf(locationHeader))
                            .filter(access -> Boolean.TRUE.equals(access.getActive())
                                    && access.getLocation() != null
                                    && Boolean.TRUE.equals(access.getLocation().getActive())
                                    && access.getRole() != null)
                            .map(com.broandbro.qrapp.entity.UserLocationAccess::getRole)
                            .orElse(UserRole.CUSTOMER);
                }
                authorities.add(new SimpleGrantedAuthority(
                        "ROLE_" + (role == null ? UserRole.CUSTOMER : role).name()));
                var auth = new UsernamePasswordAuthenticationToken(u.getPhone(), null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
                log.info("Authentication set in SecurityContext for user: {} with roles: {}", u.getPhone(), authorities);
            } else {
                log.warn("No user found with token: {}", token);
            }
        } else {
            log.debug("No Bearer token found in Authorization header");
        }

        filterChain.doFilter(request, response);
    }
}
