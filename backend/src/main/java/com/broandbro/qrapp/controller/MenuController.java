package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.Tag;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.TagRepository;
import com.broandbro.qrapp.dto.MenuItemResponse;
import com.broandbro.qrapp.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestParam;

import org.springframework.util.StringUtils;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;
import org.springframework.web.bind.annotation.RequestHeader;

import jakarta.servlet.http.HttpServletRequest;


@RestController
@RequestMapping("/menu")
@RequiredArgsConstructor
public class MenuController {

    private static final Logger log = LoggerFactory.getLogger(MenuController.class);
    private static final int DEFAULT_MENU_PAGE = 0;
    private static final int DEFAULT_MENU_SIZE = 200;
    private static final int MAX_MENU_SIZE = 200;
    private static final int DEFAULT_RECOMMENDED_LIMIT = 6;
    private static final int MAX_RECOMMENDED_LIMIT = 24;

    private final MenuRepository repo;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final InventoryService inventoryService;

    // helper to store uploaded file under resources/static/uploads and return public URL
    private String storeUploadedFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;
        Path uploadDir = Paths.get("src/main/resources/static/uploads");
        Files.createDirectories(uploadDir);
        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "file" : file.getOriginalFilename());
        String filename = UUID.randomUUID() + "_" + original;
        Path target = uploadDir.resolve(filename);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        return "/uploads/" + filename;
    }

    @GetMapping
    @Cacheable(cacheNames = "menu", key = "T(java.lang.String).format('%s|%s|%s|%s|%s|%s', #isVeg, #categoryId, #recommended, #available, #page, #size)")
    public List<MenuItemResponse> getMenu(
            @RequestParam(value = "isVeg", required = false) Boolean isVeg,
            @RequestParam(value = "categoryId", required = false) Long categoryId,
            @RequestParam(value = "recommended", required = false) Boolean recommended,
            @RequestParam(value = "available", required = false) Boolean available,
            @RequestParam(value = "page", defaultValue = "0") Integer page,
            @RequestParam(value = "size", defaultValue = "200") Integer size
    ) {
        int safePage = page == null ? DEFAULT_MENU_PAGE : Math.max(0, page);
        int safeSize = size == null ? DEFAULT_MENU_SIZE : Math.max(1, Math.min(size, MAX_MENU_SIZE));
        // available=true → show only orderable items; null/false → show all
        boolean availableOnly = Boolean.TRUE.equals(available);
        List<MenuItem> items = repo.findByFilters(isVeg, categoryId, recommended, availableOnly, PageRequest.of(safePage, safeSize));
        return items.stream()
            .map(this::buildMenuItemResponse)
            .toList();
    }


    @GetMapping("/recommended")
    @Cacheable(cacheNames = "menuRecommended", key = "#limit == null ? 'default' : #limit")
    public List<MenuItemResponse> getRecommendedMenu(@RequestParam(value = "limit", required = false) Integer limit) {
        int safeLimit = limit == null ? DEFAULT_RECOMMENDED_LIMIT : Math.max(1, Math.min(limit, MAX_RECOMMENDED_LIMIT));
        List<MenuItem> items = repo.findTopRecommended(PageRequest.of(0, safeLimit));
        return items.stream()
            .map(this::buildMenuItemResponse)
            .toList();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public MenuItem addMenuItem(@Valid @RequestBody MenuItem item) {
        // Ensure id is null so a new entity is created rather than updated
        item.setId(null);
        return repo.save(item);
    }

    // New multipart/form-data POST handler so admin can upload an image when creating an item
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public ResponseEntity<?> addMenuItemMultipart(
            @RequestPart("name") String name,
            @RequestPart(value = "price", required = false) String priceStr,
            @RequestPart(value = "categoryId", required = false) String categoryIdStr,
            @RequestPart(value = "description", required = false) String description,
            @RequestPart(value = "isHidden", required = false) String isHiddenStr,
            @RequestPart(value = "recommended", required = false) String recommendedStr,
            @RequestPart(value = "tagId", required = false) String tagIdStr,
            @RequestPart(value = "isVeg", required = false) String isVegStr,
            @RequestPart(value = "inventoryMode", required = false) String inventoryModeStr,
            @RequestPart(value = "image", required = false) MultipartFile image
    ) {
        try {
            MenuItem item = new MenuItem();
            item.setId(null);
            item.setName(name == null ? "" : name);
            double price = 0.0;
            if (priceStr != null && !priceStr.isBlank()) {
                try {
                    price = Double.parseDouble(priceStr);
                } catch (NumberFormatException nfe) {
                    return ResponseEntity.badRequest().body("Invalid price format");
                }
            }
            item.setBasePrice(new java.math.BigDecimal(price));

            // Set category if categoryId is provided
            if (categoryIdStr != null && !categoryIdStr.isBlank()) {
                try {
                    Long categoryId = Long.parseLong(categoryIdStr);
                    Category category = categoryRepository.findById(categoryId)
                            .orElseThrow(() -> new RuntimeException("Category not found with id: " + categoryId));
                    item.setCategory(category);
                } catch (NumberFormatException nfe) {
                    return ResponseEntity.badRequest().body("Invalid category ID format");
                }
            }

            item.setDescription(description);

            // Set inventory fields with proper defaults
            item.setIsHidden(isHiddenStr != null && Boolean.parseBoolean(isHiddenStr));

            // Set inventory mode
            if (inventoryModeStr != null && !inventoryModeStr.isBlank()) {
                try {
                    item.setInventoryMode(com.broandbro.qrapp.enums.InventoryMode.valueOf(inventoryModeStr.toUpperCase()));
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body("Invalid inventory mode: " + inventoryModeStr);
                }
            }

            item.setRecommended(Boolean.parseBoolean(recommendedStr));

            // Set tag if tagId is provided
            if (tagIdStr != null && !tagIdStr.isBlank()) {
                try {
                    Long tagId = Long.parseLong(tagIdStr);
                    Tag tag = tagRepository.findById(tagId)
                            .orElseThrow(() -> new RuntimeException("Tag not found with id: " + tagId));
                    item.setTag(tag);
                } catch (NumberFormatException nfe) {
                    return ResponseEntity.badRequest().body("Invalid tag ID format");
                }
            }

            if (isVegStr != null) {
                item.setIsVeg(Boolean.parseBoolean(isVegStr));
            }
            if (image != null && !image.isEmpty()) {
                try {
                    String url = storeUploadedFile(image);
                    item.setImageUrl(url);
                } catch (IOException ioe) {
                    log.error("Failed to store uploaded image", ioe);
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to store image");
                }
            }
            MenuItem saved = repo.save(item);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (RuntimeException ex) {
            log.error("Failed to create menu item (multipart)", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        } catch (Exception ex) {
            log.error("Failed to create menu item (multipart)", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to create menu item");
        }
    }

    // --- Flexible single PUT handler (handles JSON, multipart, raw bytes) ---
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public ResponseEntity<?> updateMenuItemFlexible(
            @PathVariable Long id,
            HttpServletRequest request,
            @RequestHeader(value = "X-Filename", required = false) String xFilename
    ) {
        Optional<MenuItem> o = repo.findById(id);
        if (o.isEmpty()) return ResponseEntity.notFound().build();
        MenuItem existing = o.get();

        String contentType = request.getContentType();
        try {
            if (contentType != null && contentType.toLowerCase().startsWith("multipart/")) {
                // multipart/form-data - use MultipartHttpServletRequest to access files and params
                if (request instanceof org.springframework.web.multipart.MultipartHttpServletRequest mreq) {
                    // params
                    String name = mreq.getParameter("name");
                    String priceStr = mreq.getParameter("price");
                    String categoryIdStr = mreq.getParameter("categoryId");
                    String description = mreq.getParameter("description");
                    String isHiddenStr = mreq.getParameter("isHidden");
                    String recommendedStr = mreq.getParameter("recommended");
                    String tagIdStr = mreq.getParameter("tagId");
                    String isVegStr = mreq.getParameter("isVeg");
                    String inventoryModeStr = mreq.getParameter("inventoryMode");

                    if (name != null) existing.setName(name);
                    if (priceStr != null && !priceStr.isBlank()) {
                        try { existing.setBasePrice(new java.math.BigDecimal(priceStr)); } catch (Exception ex) { /* ignore */ }
                    }
                    if (categoryIdStr != null && !categoryIdStr.isBlank()) {
                        try {
                            Long categoryId = Long.parseLong(categoryIdStr);
                            Category category = categoryRepository.findById(categoryId)
                                    .orElseThrow(() -> new RuntimeException("Category not found with id: " + categoryId));
                            existing.setCategory(category);
                        } catch (NumberFormatException ex) { /* ignore */ }
                    }
                    if (description != null) existing.setDescription(description);
                    if (isHiddenStr != null) existing.setIsHidden(Boolean.parseBoolean(isHiddenStr));
                    if (recommendedStr != null) existing.setRecommended(Boolean.parseBoolean(recommendedStr));
                    if (inventoryModeStr != null && !inventoryModeStr.isBlank()) {
                        try {
                            existing.setInventoryMode(com.broandbro.qrapp.enums.InventoryMode.valueOf(inventoryModeStr.toUpperCase()));
                        } catch (IllegalArgumentException ex) { /* ignore */ }
                    }
                    if (tagIdStr != null && !tagIdStr.isBlank()) {
                        try {
                            Long tagId = Long.parseLong(tagIdStr);
                            Tag tag = tagRepository.findById(tagId)
                                    .orElseThrow(() -> new RuntimeException("Tag not found with id: " + tagId));
                            existing.setTag(tag);
                        } catch (NumberFormatException ex) { /* ignore */ }
                    }
                    if (isVegStr != null) existing.setIsVeg(Boolean.parseBoolean(isVegStr));

                    org.springframework.web.multipart.MultipartFile file = mreq.getFile("image");
                    if (file != null && !file.isEmpty()) {
                        try {
                            String url = storeUploadedFile(file);
                            existing.setImageUrl(url);
                        } catch (IOException ioe) {
                            log.error("Failed to store multipart file", ioe);
                            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to store image");
                        }
                    }

                    MenuItem saved = repo.save(existing);
                    return ResponseEntity.ok(saved);
                } else {
                    // If multipart resolver didn't wrap it, fall back to attempting parsing as multipart is not available
                    return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body("Multipart request required");
                }
            }

            if (contentType != null && contentType.toLowerCase().contains("application/json")) {
                // JSON body
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                java.util.Map<String, Object> payload = mapper.readValue(request.getInputStream(), new com.fasterxml.jackson.core.type.TypeReference<>(){});
                // reuse defensive update logic
                if (payload.containsKey("name")) existing.setName((String) payload.getOrDefault("name", existing.getName()));
                if (payload.containsKey("price")) {
                    Object p = payload.get("price");
                    try {
                        double pd = p instanceof Number ? ((Number)p).doubleValue() : Double.parseDouble(String.valueOf(p));
                        existing.setBasePrice(new java.math.BigDecimal(pd));
                    } catch (Exception ex) { /* ignore invalid price */ }
                }
                if (payload.containsKey("categoryId")) {
                    Object c = payload.get("categoryId");
                    if (c != null) {
                        try {
                            Long categoryId = c instanceof Number ? ((Number)c).longValue() : Long.parseLong(String.valueOf(c));
                            Category category = categoryRepository.findById(categoryId)
                                    .orElseThrow(() -> new RuntimeException("Category not found with id: " + categoryId));
                            existing.setCategory(category);
                        } catch (Exception ex) { /* ignore */ }
                    }
                }
                if (payload.containsKey("description")) existing.setDescription((String) payload.getOrDefault("description", existing.getDescription()));
                if (payload.containsKey("isHidden")) {
                    Object h = payload.get("isHidden");
                    boolean hid = h instanceof Boolean ? (Boolean)h : Boolean.parseBoolean(String.valueOf(h));
                    existing.setIsHidden(hid);
                }
                if (payload.containsKey("recommended")) {
                    Object r = payload.get("recommended");
                    boolean rec = r instanceof Boolean ? (Boolean) r : Boolean.parseBoolean(String.valueOf(r));
                    existing.setRecommended(rec);
                }
                if (payload.containsKey("inventoryMode")) {
                    Object im = payload.get("inventoryMode");
                    if (im != null) {
                        try {
                            existing.setInventoryMode(com.broandbro.qrapp.enums.InventoryMode.valueOf(String.valueOf(im).toUpperCase()));
                        } catch (Exception ex) { /* ignore */ }
                    }
                }
                if (payload.containsKey("tagId")) {
                    Object t = payload.get("tagId");
                    if (t != null) {
                        try {
                            Long tagId = t instanceof Number ? ((Number)t).longValue() : Long.parseLong(String.valueOf(t));
                            Tag tag = tagRepository.findById(tagId)
                                    .orElseThrow(() -> new RuntimeException("Tag not found with id: " + tagId));
                            existing.setTag(tag);
                        } catch (Exception ex) { /* ignore */ }
                    }
                }
                if (payload.containsKey("isVeg")) {
                    Object v = payload.get("isVeg");
                    boolean iv = v instanceof Boolean ? (Boolean)v : Boolean.parseBoolean(String.valueOf(v));
                    existing.setIsVeg(iv);
                }
                if (payload.containsKey("imageUrl") && payload.get("imageUrl") != null) existing.setImageUrl((String) payload.get("imageUrl"));

                MenuItem saved = repo.save(existing);
                return ResponseEntity.ok(saved);
            }

            // Fallback: treat body as raw bytes (octet-stream or unknown content type)
            try (InputStream in = request.getInputStream()) {
                String original = xFilename != null && !xFilename.isBlank() ? StringUtils.cleanPath(xFilename) : "upload";
                String filename = UUID.randomUUID() + "_" + original;
                Path uploadDir = Paths.get("src/main/resources/static/uploads");
                Files.createDirectories(uploadDir);
                Path target = uploadDir.resolve(filename);
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
                String url = "/uploads/" + filename;
                existing.setImageUrl(url);
                MenuItem saved = repo.save(existing);
                return ResponseEntity.ok(saved);
            } catch (IOException ioe) {
                log.error("Failed to store raw uploaded image", ioe);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to store image");
            }

        } catch (IOException ex) {
            log.error("Failed to process update request", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to process request");
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public ResponseEntity<?> deleteMenuItem(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            repo.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (DataIntegrityViolationException dive) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Cannot delete menu item: it is referenced by existing orders");
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to delete menu item");
        }
    }

    /**
     * Helper method to convert MenuItem entity to MenuItemResponse DTO
     * Includes inventory information from InventoryService
     */
    private MenuItemResponse buildMenuItemResponse(MenuItem item) {
        Long categoryId = item.getCategory() != null ? item.getCategory().getId() : null;
        Long tagId = item.getTag() != null ? item.getTag().getId() : null;
        Long shopId = item.getShop() != null ? item.getShop().getId() : null;

        return MenuItemResponse.builder()
            .id(item.getId())
            .name(item.getName())
            .description(item.getDescription())
            .price(item.getSellingPrice())
            .imageUrl(item.getImageUrl())
            .isVeg(item.getIsVeg())
            .recommended(item.isRecommended())
            .basePrice(item.getBasePrice())
            .margin(item.getMargin())
            .categoryId(categoryId)
            .tagId(tagId)
            .shopId(shopId)
            .inventoryMode(item.getInventoryMode())
            .isHidden(item.getIsHidden())
            .createdAt(item.getCreatedAt())
            .updatedAt(item.getUpdatedAt())
            .stockStatus(inventoryService.getStockStatus(item.getId()))
            .build();
    }
}
