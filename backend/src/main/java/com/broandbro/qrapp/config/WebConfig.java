package com.broandbro.qrapp.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

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
        // CORS is configured in SecurityConfig.java (Spring Security configuration)
        // Using addCorsMappings here alongside Security's CorsConfigurationSource causes conflicts
        // when allowCredentials=true and allowedOrigins contains wildcards.
        // Spring Security's CORS takes precedence; this method is disabled to avoid duplication.
    }
}
