package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.PartyOrder;
import com.broandbro.qrapp.enums.PartyOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface PartyOrderRepository extends JpaRepository<PartyOrder, Long> {

    /** All orders for a specific user, newest first. */
    List<PartyOrder> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Admin: all orders, newest first. */
    List<PartyOrder> findAllByOrderByCreatedAtDesc();

    /** Admin: orders in a given status. */
    List<PartyOrder> findByStatusOrderByCreatedAtDesc(PartyOrderStatus status);

    /** Admin (location-scoped): all orders whose location is in the given set, newest first. */
    List<PartyOrder> findByLocationIdInOrderByCreatedAtDesc(Collection<Long> locationIds);

    /** Admin (location-scoped): orders in a given status whose location is in the given set. */
    List<PartyOrder> findByStatusAndLocationIdInOrderByCreatedAtDesc(
            PartyOrderStatus status, Collection<Long> locationIds);

    /** Clear location for party orders when location is deleted. */
    @Modifying
    @Query("UPDATE PartyOrder p SET p.location = null WHERE p.location.id = :locationId")
    void clearLocationForPartyOrders(@Param("locationId") Long locationId);
}


