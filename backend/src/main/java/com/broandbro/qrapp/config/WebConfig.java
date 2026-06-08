package com.broandbro.qrapp.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.cors.allowed-origins:}")
    private String allowedOrigins;

    /** Directory where uploaded menu-item images are stored at runtime. */
    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve uploaded menu-item images at /uploads/**
        // Resolves to an absolute file:// path so it works both in the IDE and from a JAR.
        Path absoluteUploadPath = Paths.get(uploadDir).toAbsolutePath();
        registry
            .addResourceHandler("/uploads/**")
            .addResourceLocations("file:" + absoluteUploadPath + "/");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String origins = allowedOrigins == null ? "" : allowedOrigins.trim();
        List<String> originList = Arrays.stream(origins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toList());

        if (originList.isEmpty()) {
            originList = List.of("http://localhost:5173");
        }

        registry
            .addMapping("/**")
            .allowedOrigins(originList.toArray(new String[0]))
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600);
    }
}
