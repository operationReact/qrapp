package com.broandbro.qrapp.config;

import com.broandbro.qrapp.security.TokenAuthFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FilterConfig {

    @Bean
    public FilterRegistrationBean<TokenAuthFilter> tokenFilter(TokenAuthFilter filter) {
        FilterRegistrationBean<TokenAuthFilter> reg = new FilterRegistrationBean<>();
        reg.setFilter(filter);
        reg.setEnabled(false);
        return reg;
    }
}

