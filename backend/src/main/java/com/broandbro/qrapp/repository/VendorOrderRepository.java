package com.broandbro.qrapp.repository;
import com.broandbro.qrapp.entity.VendorOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface VendorOrderRepository extends JpaRepository<VendorOrder, Long> {

    /** Admin (location-scoped): all vendor orders whose location is in the given set, newest first. */
    List<VendorOrder> findByLocationIdInOrderByCreatedAtDesc(Collection<Long> locationIds);
}
