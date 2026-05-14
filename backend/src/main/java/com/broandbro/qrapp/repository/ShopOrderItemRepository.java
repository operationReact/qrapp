package com.broandbro.qrapp.repository;
import com.broandbro.qrapp.entity.ShopOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ShopOrderItemRepository extends JpaRepository<ShopOrderItem, Long> {
}
