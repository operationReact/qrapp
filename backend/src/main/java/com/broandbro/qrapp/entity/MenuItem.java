package com.broandbro.qrapp.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Column;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "menu_item")
@Data
public class MenuItem {

    @Id
    @GeneratedValue
    private Long id;
    private String name;
    private double price;
    private String category;
    private boolean available;
    // Make recommended nullable to avoid forcing a NOT NULL schema change that may time out
    // Use Boolean so adding the column is a fast nullable add; provide a convenience
    // isRecommended() to preserve existing code that calls the boolean-style getter.
    private Boolean recommended;
    private String description;
    @Column(name = "image_url")
    private String imageUrl;
    private String tag;
    @Column(name = "is_veg")
    private Boolean isVeg;

    public boolean isRecommended() {
        return Boolean.TRUE.equals(this.recommended);
    }

}
