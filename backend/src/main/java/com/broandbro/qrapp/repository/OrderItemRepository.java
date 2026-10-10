package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findAllByOrderIdIn(List<Long> orderIds);

    List<OrderItem> findAllByOrderId(Long orderId);

	@Query(value = """
			SELECT COALESCE(SUM(oi.selling_price_snapshot * oi.quantity), 0)
			FROM order_item oi
			WHERE oi.order_id = :orderId
			""", nativeQuery = true)
	Double calculateOrderTotal(@Param("orderId") Long orderId);
}
