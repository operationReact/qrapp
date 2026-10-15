package com.broandbro.qrapp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Configures the async thread pool used for AI image generation tasks.
 * Keeps image generation off the main request thread for non-blocking API responses.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Dedicated thread pool for AI image generation so it does not
     * compete with standard Spring async tasks.
     */
    @Bean("imageGenerationExecutor")
    public Executor imageGenerationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(3);   // 3 = max parallel option generations (one per image)
        executor.setMaxPoolSize(6);    // headroom for concurrent admin requests
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("img-gen-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }

}
