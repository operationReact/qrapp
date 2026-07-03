package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.PartyOrderMenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PartyOrderMenuItemRepository extends JpaRepository<PartyOrderMenuItem, Long> {
    List<PartyOrderMenuItem> findByPartyOrderIdOrderByCreatedAtAsc(Long partyOrderId);
    void deleteByPartyOrderId(Long partyOrderId);
}

