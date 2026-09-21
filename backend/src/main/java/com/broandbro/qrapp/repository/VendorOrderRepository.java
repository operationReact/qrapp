package com.broandbro.qrapp.repository;
import com.broandbro.qrapp.entity.VendorOrder;
import org.springframework.data.jpa.repository.JpaRepository;
public interface VendorOrderRepository extends JpaRepository<VendorOrder, Long> {
}
