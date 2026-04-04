package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findAllByOrderIdIn(List<Long> orderIds);

	@Query(value = """
			SELECT COALESCE(SUM(mi.price * oi.quantity), 0)
			FROM order_item oi
			JOIN menu_item mi ON mi.id = oi.item_id
			WHERE oi.order_id = :orderId
			""", nativeQuery = true)
	Double calculateOrderTotal(@Param("orderId") Long orderId);
}
