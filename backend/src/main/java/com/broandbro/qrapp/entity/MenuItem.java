package com.broandbro.qrapp.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.Data;

@Entity
@Data
public class MenuItem {
    @Id
    @GeneratedValue
    private Long id;
    private String name;
    private double price;
    private String category;
    private boolean available;
    private String description;
    private String imageUrl;
    private String tag;
    private Boolean isVeg;
}