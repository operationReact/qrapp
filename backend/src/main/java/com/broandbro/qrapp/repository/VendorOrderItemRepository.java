package com.broandbro.qrapp.repository;
import com.broandbro.qrapp.entity.VendorOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
public interface VendorOrderItemRepository extends JpaRepository<VendorOrderItem, Long> {
}
