package com.broandbro.qrapp.repository;
import com.broandbro.qrapp.entity.ShopOrder;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ShopOrderRepository extends JpaRepository<ShopOrder, Long> {
}
