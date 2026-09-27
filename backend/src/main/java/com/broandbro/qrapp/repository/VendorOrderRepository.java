package com.broandbro.qrapp.repository;
import com.broandbro.qrapp.entity.VendorOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface VendorOrderRepository extends JpaRepository<VendorOrder, Long> {

    /** Admin (location-scoped): all vendor orders whose location is in the given set, newest first. */
    List<VendorOrder> findByLocationIdInOrderByCreatedAtDesc(Collection<Long> locationIds);

    /** Clear location for vendor orders when location is deleted. */
    @Modifying
    @Query("UPDATE VendorOrder v SET v.location = null WHERE v.location.id = :locationId")
    void clearLocationForVendorOrders(@Param("locationId") Long locationId);
}
