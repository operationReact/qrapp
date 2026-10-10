package com.broandbro.qrapp.service;

import com.broandbro.qrapp.config.OpenAiProperties;
import com.broandbro.qrapp.config.ProductAiImageProperties;
import com.broandbro.qrapp.entity.Product;
import com.broandbro.qrapp.entity.ProductImageGenerationSession;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.ProductImageGenerationStatus;
import com.broandbro.qrapp.dto.ProductImageGenerationResponse;
import com.broandbro.qrapp.repository.ProductImageGenerationSessionRepository;
import com.broandbro.qrapp.service.ai.ImageGenerationService;
import com.broandbro.qrapp.storage.ImageStorageService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductImageGenerationService {
    private static final Set<String> SUPPORTED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private final ProductAiImageProperties properties;
    private final OpenAiProperties openAiProperties;
    private final ProductCatalogService catalogService;
    private final ProductImagePromptService promptService;
    private final ProductImageGenerationSessionRepository sessionRepository;
    private final ImageGenerationService imageGenerationService;
    private final ImageStorageService imageStorageService;
    private final UserService userService;
    private final Set<Long> inFlight = ConcurrentHashMap.newKeySet();

    public ProductImageGenerationResponse generate(Long productId, MultipartFile source,
                                                    Authentication authentication) {
        if (!properties.isEnabled()) {
            throw new IllegalStateException("Product AI image generation is disabled");
        }
        if (!inFlight.add(productId)) {
            throw new IllegalStateException("An image generation is already in progress for this product");
        }
        ProductImageGenerationSession session = null;
        try {
            Product product = catalogService.requireProductImageAccess(productId, authentication);
            enforceLimit(productId);
            ImageData sourceData = validateImage(source);
            if (!imageGenerationService.supportsReferenceImages()) {
                throw new IllegalStateException("The configured image provider does not support reference images");
            }
            String prompt = promptService.build(product);
            session = newSession(product, sourceData, authentication, prompt);
            ImageStorageService.StoredImage sourceStored = imageStorageService.uploadImageWithKey(
                    sourceData.bytes, "products/ai-sources/" + productId,
                    fileStem(product) + "-source-" + session.getId() + extension(sourceData.contentType),
                    sourceData.contentType);
            session.setSourceUrl(sourceStored.url());
            session.setSourceKey(sourceStored.key());
            sessionRepository.save(session);

            byte[] generatedBytes = imageGenerationService.generateImageFromPromptAndReference(
                    prompt, sourceData.bytes, sourceData.contentType, openAiProperties.getImageSize());
            ImageData generatedData = validateGenerated(generatedBytes);
            ImageStorageService.StoredImage generatedStored = imageStorageService.uploadImageWithKey(
                    generatedData.bytes, "products/ai-generated/" + productId + "/" + session.getId(),
                    fileStem(product) + extension(generatedData.contentType),
                    generatedData.contentType);
            session.setGeneratedUrl(generatedStored.url());
            session.setGeneratedKey(generatedStored.key());
            session.setGeneratedContentType(generatedData.contentType);
            session.setGeneratedBytes((long) generatedData.bytes.length);
            session.setGeneratedWidth(generatedData.width);
            session.setGeneratedHeight(generatedData.height);
            session.setStatus(ProductImageGenerationStatus.GENERATED);
            session.setCompletedAt(Instant.now());
            session.setProvider(imageGenerationService.getProviderName());
            session.setModel(imageGenerationService.getModelName());
            session.setProviderMetadata("usage_not_returned_by_provider");
            sessionRepository.save(session);
            log.info("[ProductAiImage] generated productId={} sessionId={} provider={} model={} bytes={}",
                    productId, session.getId(), session.getProvider(), session.getModel(), generatedData.bytes.length);
            return toResponse(session);
        } catch (RuntimeException error) {
            if (session != null) {
                session.setStatus(ProductImageGenerationStatus.FAILED);
                session.setErrorMessage(truncate(error.getMessage(), 1000));
                session.setCompletedAt(Instant.now());
                sessionRepository.save(session);
            }
            throw error;
        } finally {
            inFlight.remove(productId);
        }
    }

    public ProductImageGenerationResponse regenerate(Long productId, Long sessionId, Authentication authentication) {
        ProductImageGenerationSession previous = loadAuthorized(productId, sessionId, authentication);
        if (previous.getSourceKey() == null || previous.getSourceKey().isBlank()) {
            throw new IllegalStateException("The source image is unavailable");
        }
        ImageStorageService.StoredContent source = imageStorageService.readImage(previous.getSourceKey());
        MultipartFile replacement = new InMemoryMultipartFile(
                "source", "preserved-source", source.contentType(), source.bytes());
        return generate(previous.getProduct().getId(), replacement, authentication);
    }

    public ProductImageGenerationResponse approve(Long productId, Long sessionId, Authentication authentication) {
        ProductImageGenerationSession session = loadAuthorized(productId, sessionId, authentication);
        if (session.getStatus() != ProductImageGenerationStatus.GENERATED
                || session.getGeneratedUrl() == null || session.getGeneratedKey() == null) {
            throw new IllegalStateException("Only an unapproved generated image can be approved");
        }
        catalogService.applyApprovedImage(session.getProduct().getId(), session.getGeneratedUrl(),
                session.getGeneratedKey(), authentication);
        session.setStatus(ProductImageGenerationStatus.APPROVED);
        session.setCompletedAt(Instant.now());
        sessionRepository.save(session);
        return toResponse(session);
    }

    public ProductImageGenerationResponse discard(Long productId, Long sessionId, Authentication authentication) {
        ProductImageGenerationSession session = loadAuthorized(productId, sessionId, authentication);
        if (session.getStatus() == ProductImageGenerationStatus.APPROVED) {
            throw new IllegalStateException("Approved product images cannot be discarded");
        }
        if (session.getGeneratedKey() != null && session.getGeneratedKey().startsWith("products/ai-generated/")) {
            imageStorageService.deleteImageByKey(session.getGeneratedKey());
        }
        session.setStatus(ProductImageGenerationStatus.DISCARDED);
        session.setCompletedAt(Instant.now());
        sessionRepository.save(session);
        return toResponse(session);
    }

    public ProductImageGenerationResponse status(Long productId, Long sessionId, Authentication authentication) {
        return toResponse(loadAuthorized(productId, sessionId, authentication));
    }

    private ProductImageGenerationSession newSession(Product product, ImageData source,
                                                       Authentication authentication, String prompt) {
        ProductImageGenerationSession session = new ProductImageGenerationSession();
        session.setProduct(product);
        session.setStatus(ProductImageGenerationStatus.PROCESSING);
        session.setSourceUrl("pending");
        session.setSourceKey("pending");
        session.setSourceContentType(source.contentType);
        session.setSourceBytes((long) source.bytes.length);
        session.setSourceWidth(source.width);
        session.setSourceHeight(source.height);
        session.setProvider(imageGenerationService.getProviderName());
        session.setModel(imageGenerationService.getModelName());
        session.setPromptHash(promptService.hash(prompt));
        session.setRequestedBy(currentUser(authentication).getId());
        return sessionRepository.save(session);
    }

    private ProductImageGenerationSession loadAuthorized(Long productId, Long sessionId,
                                                         Authentication authentication) {
        ProductImageGenerationSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Image generation session not found"));
        if (!productId.equals(session.getProduct().getId())) {
            throw new org.springframework.security.access.AccessDeniedException("image_session_product_mismatch");
        }
        catalogService.requireProductImageAccess(session.getProduct().getId(), authentication);
        return session;
    }

    private void enforceLimit(Long productId) {
        sessionRepository.findFirstByProductIdAndStatusOrderByCreatedAtDesc(
                        productId, ProductImageGenerationStatus.PROCESSING)
                .ifPresent(existing -> {
                    throw new IllegalStateException("An image generation is already in progress for this product");
                });
        long recent = sessionRepository.countByProductIdAndCreatedAtAfter(
                productId, Instant.now().minus(1, ChronoUnit.HOURS));
        if (recent >= properties.getMaxGenerationsPerProductPerHour()) {
            throw new IllegalStateException("Product image generation limit reached; try again later");
        }
    }

    private User currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new org.springframework.security.access.AccessDeniedException("authentication_required");
        }
        return userService.findByPhone(authentication.getName())
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("authentication_required"));
    }

    private ImageData validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Source image is required");
        if (file.getSize() > properties.getMaxSourceBytes()) {
            throw new IllegalArgumentException("Source image exceeds the configured size limit");
        }
        try {
            return inspect(file.getBytes(), file.getContentType(), true);
        } catch (IOException e) {
            throw new IllegalArgumentException("Unable to read source image", e);
        }
    }

    private ImageData validateGenerated(byte[] bytes) {
        return inspect(bytes, null, false);
    }

    private ImageData inspect(byte[] bytes, String declaredType, boolean source) {
        try (ByteArrayInputStream input = new ByteArrayInputStream(bytes);
             ImageInputStream imageInput = ImageIO.createImageInputStream(input)) {
            if (imageInput == null) throw new IllegalArgumentException("Invalid image content");
            Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInput);
            if (!readers.hasNext()) throw new IllegalArgumentException("Invalid image content");
            ImageReader reader = readers.next();
            String format = reader.getFormatName().toLowerCase(Locale.ROOT);
            String actualType = format.equals("jpg") || format.equals("jpeg") ? "image/jpeg"
                    : format.equals("png") ? "image/png"
                    : format.equals("webp") ? "image/webp" : null;
            if (actualType == null || (source && (declaredType == null
                    || !actualType.equals(declaredType.toLowerCase(Locale.ROOT))))) {
                throw new IllegalArgumentException("Image content does not match JPEG, PNG or WEBP");
            }
            reader.setInput(imageInput);
            int width = reader.getWidth(0);
            int height = reader.getHeight(0);
            if (width < 1 || height < 1 || width > properties.getMaxWidth() || height > properties.getMaxHeight()) {
                throw new IllegalArgumentException("Image dimensions exceed the configured limit");
            }
            BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(bytes));
            if (decoded == null) throw new IllegalArgumentException("Invalid image content");
            return new ImageData(bytes, actualType, width, height);
        } catch (IOException | RuntimeException e) {
            if (e instanceof IllegalArgumentException) throw (IllegalArgumentException) e;
            throw new IllegalArgumentException("Invalid image content", e);
        }
    }

    private String fileStem(Product product) {
        String value = String.join("-", product.getName(), product.getVariantIdentity());
        String slug = value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        return slug.isBlank() ? "product-" + product.getId() : slug;
    }

    private String extension(String contentType) {
        return "image/jpeg".equals(contentType) ? ".jpg"
                : "image/webp".equals(contentType) ? ".webp" : ".png";
    }

    private String truncate(String value, int max) {
        if (value == null) return "Image generation failed";
        return value.length() > max ? value.substring(0, max) : value;
    }

    private ProductImageGenerationResponse toResponse(ProductImageGenerationSession session) {
        return ProductImageGenerationResponse.builder()
                .sessionId(session.getId()).productId(session.getProduct().getId())
                .status(session.getStatus()).sourceUrl(session.getSourceUrl())
                .generatedUrl(session.getGeneratedUrl()).provider(session.getProvider())
                .model(session.getModel()).error(session.getErrorMessage())
                .sourceBytes(session.getSourceBytes()).sourceWidth(session.getSourceWidth())
                .sourceHeight(session.getSourceHeight()).generatedBytes(session.getGeneratedBytes())
                .generatedWidth(session.getGeneratedWidth()).generatedHeight(session.getGeneratedHeight())
                .build();
    }

    private record ImageData(byte[] bytes, String contentType, int width, int height) {}

    private static final class InMemoryMultipartFile implements MultipartFile {
        private final String name;
        private final String originalFilename;
        private final String contentType;
        private final byte[] bytes;

        private InMemoryMultipartFile(String name, String originalFilename, String contentType, byte[] bytes) {
            this.name = name; this.originalFilename = originalFilename;
            this.contentType = contentType; this.bytes = bytes;
        }
        public String getName() { return name; }
        public String getOriginalFilename() { return originalFilename; }
        public String getContentType() { return contentType; }
        public boolean isEmpty() { return bytes.length == 0; }
        public long getSize() { return bytes.length; }
        public byte[] getBytes() { return bytes; }
        public java.io.InputStream getInputStream() { return new ByteArrayInputStream(bytes); }
        public void transferTo(java.io.File dest) throws IOException { java.nio.file.Files.write(dest.toPath(), bytes); }
    }
}
