package com.broandbro.qrapp.addon.repository;

import com.broandbro.qrapp.addon.entity.OrderItemAddon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemAddonRepository extends JpaRepository<OrderItemAddon, Long> {

    List<OrderItemAddon> findByOrderItemIdIn(List<Long> orderItemIds);
}
