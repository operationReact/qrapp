package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.MenuItemImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MenuItemImageRepository extends JpaRepository<MenuItemImage, Long> {

    Optional<MenuItemImage> findByMenuItemId(Long menuItemId);

    boolean existsByMenuItemId(Long menuItemId);

    void deleteByMenuItemId(Long menuItemId);
}

