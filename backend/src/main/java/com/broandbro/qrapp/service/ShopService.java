package com.broandbro.qrapp.service;
import com.broandbro.qrapp.dto.ShopRequest;
import com.broandbro.qrapp.dto.ShopResponse;
import com.broandbro.qrapp.entity.Shop;
import com.broandbro.qrapp.exception.DuplicatePhoneException;
import com.broandbro.qrapp.repository.ShopRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
@Service
@Transactional
public class ShopService {
    private static final Logger log = LoggerFactory.getLogger(ShopService.class);
    private final ShopRepository shopRepository;
    public ShopService(ShopRepository shopRepository) {
        this.shopRepository = shopRepository;
    }
    public ShopResponse createShop(ShopRequest request) {
        // Validate duplicate phone
        shopRepository.findByPhoneNumber(request.getPhoneNumber())
            .ifPresent(s -> {
                throw new DuplicatePhoneException("Phone number already registered: " + request.getPhoneNumber());
            });
        Shop shop = new Shop();
        shop.setShopName(request.getShopName());
        shop.setPhoneNumber(request.getPhoneNumber());
        shop.setAlternatePhoneNumber(request.getAlternatePhoneNumber());
        shop.setAddress(request.getAddress());
        shop.setIsActive(true);
        Shop savedShop = shopRepository.save(shop);
        log.info("Shop created with id: {} and phone: {}", savedShop.getId(), savedShop.getPhoneNumber());
        // TODO: Publish ShopCreatedEvent for async WhatsApp onboarding
        // publishEvent(new ShopCreatedEvent(savedShop));
        return mapToResponse(savedShop);
    }
    public ShopResponse getShop(Long shopId) {
        Shop shop = shopRepository.findById(shopId)
            .orElseThrow(() -> new RuntimeException("Shop not found: " + shopId));
        return mapToResponse(shop);
    }
    private ShopResponse mapToResponse(Shop shop) {
        ShopResponse response = new ShopResponse();
        response.setId(shop.getId());
        response.setShopName(shop.getShopName());
        response.setPhoneNumber(shop.getPhoneNumber());
        response.setAlternatePhoneNumber(shop.getAlternatePhoneNumber());
        response.setAddress(shop.getAddress());
        response.setIsActive(shop.getIsActive());
        response.setCreatedAt(shop.getCreatedAt());
        response.setUpdatedAt(shop.getUpdatedAt());
        return response;
    }
}
