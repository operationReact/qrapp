package com.broandbro.qrapp.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentMap;

/**
 * Admin endpoint for managing the application cache at runtime.
 *
 * <pre>
 *   GET    /api/cache               – list all registered cache names
 *   GET    /api/cache/{name}        – get details / confirm a named cache exists
 *   GET    /api/cache/{name}/{key}  – look up a specific key inside a named cache
 *   DELETE /api/cache               – evict ALL caches in the application
 *   DELETE /api/cache/{name}        – evict a single named cache
 * </pre>
 */
@RestController
@RequestMapping("/api/cache")
@RequiredArgsConstructor
@Slf4j
public class CacheAdminController {

    private final CacheManager cacheManager;

    // -------------------------------------------------------------------------
    // GET  /api/cache  – list all caches
    // -------------------------------------------------------------------------

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> listCaches() {
        Collection<String> names = cacheManager.getCacheNames();
        return ResponseEntity.ok(Map.of(
                "caches",    names,
                "count",     names.size(),
                "timestamp", Instant.now().toString()
        ));
    }

    // -------------------------------------------------------------------------
    // GET  /api/cache/{name}  – show all entries stored in a named cache
    // -------------------------------------------------------------------------

    @GetMapping("/{name}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getCacheByName(@PathVariable String name) {
        Cache cache = cacheManager.getCache(name);
        if (cache == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error",     "Cache not found: " + name,
                    "available", cacheManager.getCacheNames()
            ));
        }

        // Unwrap the native Caffeine cache to get all stored entries
        Object nativeCache = cache.getNativeCache();
        Map<Object, Object> entries = new LinkedHashMap<>();

        if (nativeCache instanceof com.github.benmanes.caffeine.cache.Cache<?, ?> caffeineCache) {
            ConcurrentMap<?, ?> map = caffeineCache.asMap();
            map.forEach((k, v) -> entries.put(k.toString(), v));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("cache",     name);
        response.put("size",      entries.size());
        response.put("entries",   entries);
        response.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(response);
    }

    // -------------------------------------------------------------------------
    // GET  /api/cache/{name}/{key}  – look up a specific key in a named cache
    // -------------------------------------------------------------------------

    @GetMapping("/{name}/{key}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getCacheValue(
            @PathVariable String name,
            @PathVariable String key) {

        Cache cache = cacheManager.getCache(name);
        if (cache == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error",     "Cache not found: " + name,
                    "available", cacheManager.getCacheNames()
            ));
        }

        Cache.ValueWrapper wrapper = cache.get(key);
        if (wrapper == null) {
            return ResponseEntity.ok(Map.of(
                    "cache",     name,
                    "key",       key,
                    "hit",       false,
                    "value",     "null",
                    "timestamp", Instant.now().toString()
            ));
        }

        Object value = wrapper.get();
        return ResponseEntity.ok(Map.of(
                "cache",     name,
                "key",       key,
                "hit",       true,
                "value",     value != null ? value.toString() : "null",
                "valueType", value != null ? value.getClass().getSimpleName() : "null",
                "timestamp", Instant.now().toString()
        ));
    }

    // -------------------------------------------------------------------------
    // DELETE  /api/cache  – evict every cache in the application
    // -------------------------------------------------------------------------

    @DeleteMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> evictAll() {
        Collection<String> names = cacheManager.getCacheNames();
        List<String> evicted = names.stream()
                .peek(name -> {
                    Cache cache = cacheManager.getCache(name);
                    if (cache != null) {
                        cache.clear();
                        log.info("Cache evicted: {}", name);
                    }
                })
                .toList();

        log.info("Full cache eviction triggered. Evicted {} caches: {}", evicted.size(), evicted);
        return ResponseEntity.ok(Map.of(
                "status",  "evicted",
                "caches",  evicted,
                "count",   evicted.size(),
                "timestamp", Instant.now().toString()
        ));
    }

    // -------------------------------------------------------------------------
    // DELETE  /api/cache/{name}  – evict a single named cache
    // -------------------------------------------------------------------------

    @DeleteMapping("/{name}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> evictByName(@PathVariable String name) {
        Cache cache = cacheManager.getCache(name);
        if (cache == null) {
            Collection<String> available = cacheManager.getCacheNames();
            return ResponseEntity.badRequest().body(Map.of(
                    "error",    "Cache not found: " + name,
                    "available", available
            ));
        }
        cache.clear();
        log.info("Cache evicted by name: {}", name);
        return ResponseEntity.ok(Map.of(
                "status",    "evicted",
                "cache",     name,
                "timestamp", Instant.now().toString()
        ));
    }
}

