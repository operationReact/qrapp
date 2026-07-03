package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.PartyOrder;
import com.broandbro.qrapp.enums.PartyOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PartyOrderRepository extends JpaRepository<PartyOrder, Long> {

    /** All orders for a specific user, newest first. */
    List<PartyOrder> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Admin: all orders, newest first. */
    List<PartyOrder> findAllByOrderByCreatedAtDesc();

    /** Admin: orders in a given status. */
    List<PartyOrder> findByStatusOrderByCreatedAtDesc(PartyOrderStatus status);
}

