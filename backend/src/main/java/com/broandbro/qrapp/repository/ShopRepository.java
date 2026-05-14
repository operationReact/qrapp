package com.broandbro.qrapp.repository;
import com.broandbro.qrapp.entity.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ShopRepository extends JpaRepository<Shop, Long> {
    Optional<Shop> findByPhoneNumber(String phoneNumber);
}
