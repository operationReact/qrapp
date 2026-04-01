package com.broandbro.qrapp;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.repository.MenuRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataLoader.class);

    private final MenuRepository menuRepository;

    public DataLoader(MenuRepository menuRepository) {
        this.menuRepository = menuRepository;
    }

    @Override
    public void run(String... args) {
        // Replace existing menu with canonical Bro & Bro Café menu on startup
        try {
            // Clear existing items
            menuRepository.deleteAll();

            // Representative images per category (Unsplash)
            final String breakfastImg = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80";
            final String lunchImg = "https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80";
            final String sandwichImg = "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80";
            final String maggiImg = "https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80";
            final String bowlsImg = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80";
            final String dosaImg = "https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80";
            final String sidesImg = "https://images.unsplash.com/photo-1542834369-f10ebf06d3fb?auto=format&fit=crop&w=800&q=80";

            // Breakfast Specials
            MenuItem i1 = new MenuItem();
            i1.setName("Healthy Oat Meal"); i1.setPrice(99); i1.setCategory("Breakfast Specials"); i1.setAvailable(true); i1.setDescription(""); i1.setIsVeg(true); i1.setImageUrl(breakfastImg);

            MenuItem i2 = new MenuItem();
            i2.setName("Oats Banana Smoothie"); i2.setPrice(89); i2.setCategory("Breakfast Specials"); i2.setAvailable(true); i2.setDescription(""); i2.setIsVeg(true); i2.setImageUrl(breakfastImg);

            MenuItem i3 = new MenuItem();
            i3.setName("Peanut Butter Toast"); i3.setPrice(89); i3.setCategory("Breakfast Specials"); i3.setAvailable(true); i3.setDescription(""); i3.setIsVeg(true); i3.setImageUrl(breakfastImg);

            MenuItem i4 = new MenuItem();
            i4.setName("Puri Bhaji"); i4.setPrice(49); i4.setCategory("Breakfast Specials"); i4.setAvailable(true); i4.setDescription(""); i4.setIsVeg(true); i4.setImageUrl(breakfastImg);

            // Lunch Meals
            MenuItem i5 = new MenuItem();
            i5.setName("Combo Meal"); i5.setPrice(99); i5.setCategory("Lunch Meals"); i5.setAvailable(true); i5.setDescription(""); i5.setIsVeg(true); i5.setImageUrl(lunchImg);

            MenuItem i6 = new MenuItem();
            i6.setName("Chapathi Combo"); i6.setPrice(99); i6.setCategory("Lunch Meals"); i6.setAvailable(true); i6.setDescription(""); i6.setIsVeg(true); i6.setImageUrl(lunchImg);

            MenuItem i7 = new MenuItem();
            i7.setName("Mini Thali"); i7.setPrice(129); i7.setCategory("Lunch Meals"); i7.setAvailable(true); i7.setDescription(""); i7.setIsVeg(true); i7.setImageUrl(lunchImg);

            MenuItem i8 = new MenuItem();
            i8.setName("Full Meal Thali"); i8.setPrice(159); i8.setCategory("Lunch Meals"); i8.setAvailable(true); i8.setDescription(""); i8.setIsVeg(true); i8.setImageUrl(lunchImg);

            // Sandwiches
            MenuItem i9 = new MenuItem();
            i9.setName("Veg Cheese Sandwich"); i9.setPrice(69); i9.setCategory("Sandwiches"); i9.setAvailable(true); i9.setDescription(""); i9.setIsVeg(true); i9.setImageUrl(sandwichImg);

            MenuItem i10 = new MenuItem();
            i10.setName("Paneer Cheese Sandwich"); i10.setPrice(89); i10.setCategory("Sandwiches"); i10.setAvailable(true); i10.setDescription(""); i10.setIsVeg(true); i10.setImageUrl(sandwichImg);

            MenuItem i11 = new MenuItem();
            i11.setName("Corn Cheese Sandwich"); i11.setPrice(79); i11.setCategory("Sandwiches"); i11.setAvailable(true); i11.setDescription(""); i11.setIsVeg(true); i11.setImageUrl(sandwichImg);

            MenuItem i12 = new MenuItem();
            i12.setName("Corn Sandwich"); i12.setPrice(69); i12.setCategory("Sandwiches"); i12.setAvailable(true); i12.setDescription(""); i12.setIsVeg(true); i12.setImageUrl(sandwichImg);

            MenuItem i13 = new MenuItem();
            i13.setName("Cheese Sandwich"); i13.setPrice(49); i13.setCategory("Sandwiches"); i13.setAvailable(true); i13.setDescription(""); i13.setIsVeg(true); i13.setImageUrl(sandwichImg);

            // Maggi Corner
            MenuItem i14 = new MenuItem();
            i14.setName("Fried Maggi"); i14.setPrice(69); i14.setCategory("Maggi Corner"); i14.setAvailable(true); i14.setDescription(""); i14.setIsVeg(false); i14.setImageUrl(maggiImg); // treat as non-veg fried special

            MenuItem i15 = new MenuItem();
            i15.setName("Veg Maggi"); i15.setPrice(59); i15.setCategory("Maggi Corner"); i15.setAvailable(true); i15.setDescription(""); i15.setIsVeg(true); i15.setImageUrl(maggiImg);

            // Fresh & Healthy Bowls
            MenuItem i16 = new MenuItem();
            i16.setName("Sweet Corn Cup"); i16.setPrice(59); i16.setCategory("Fresh & Healthy Bowls"); i16.setAvailable(true); i16.setDescription(""); i16.setIsVeg(true); i16.setImageUrl(bowlsImg);

            MenuItem i17 = new MenuItem();
            i17.setName("Sprouts Chaat"); i17.setPrice(79); i17.setCategory("Fresh & Healthy Bowls"); i17.setAvailable(true); i17.setDescription(""); i17.setIsVeg(true); i17.setImageUrl(bowlsImg);

            MenuItem i18 = new MenuItem();
            i18.setName("Fruit Bowl"); i18.setPrice(49); i18.setCategory("Fresh & Healthy Bowls"); i18.setAvailable(true); i18.setDescription(""); i18.setIsVeg(true); i18.setImageUrl(bowlsImg);

            MenuItem i19 = new MenuItem();
            i19.setName("Yogurt Fruit Bowl"); i19.setPrice(169); i19.setCategory("Fresh & Healthy Bowls"); i19.setAvailable(true); i19.setDescription(""); i19.setIsVeg(true); i19.setImageUrl(bowlsImg);

            // Dosa Corner
            MenuItem i20 = new MenuItem();
            i20.setName("Plain Dosa"); i20.setPrice(39); i20.setCategory("Dosa Corner"); i20.setAvailable(true); i20.setDescription(""); i20.setIsVeg(true); i20.setImageUrl(dosaImg);

            MenuItem i21 = new MenuItem();
            i21.setName("Onion Dosa"); i21.setPrice(49); i21.setCategory("Dosa Corner"); i21.setAvailable(true); i21.setDescription(""); i21.setIsVeg(true); i21.setImageUrl(dosaImg);

            MenuItem i22 = new MenuItem();
            i22.setName("Ghee Dosa"); i22.setPrice(49); i22.setCategory("Dosa Corner"); i22.setAvailable(true); i22.setDescription(""); i22.setIsVeg(true); i22.setImageUrl(dosaImg);

            MenuItem i23 = new MenuItem();
            i23.setName("Karam Dosa"); i23.setPrice(49); i23.setCategory("Dosa Corner"); i23.setAvailable(true); i23.setDescription(""); i23.setIsVeg(true); i23.setImageUrl(dosaImg);

            MenuItem i24 = new MenuItem();
            i24.setName("Masala Dosa"); i24.setPrice(59); i24.setCategory("Dosa Corner"); i24.setAvailable(true); i24.setDescription(""); i24.setIsVeg(true); i24.setImageUrl(dosaImg);

            MenuItem i25 = new MenuItem();
            i25.setName("Ghee Karam Dosa"); i25.setPrice(59); i25.setCategory("Dosa Corner"); i25.setAvailable(true); i25.setDescription(""); i25.setIsVeg(true); i25.setImageUrl(dosaImg);

            // A few extra non-veg test items
            MenuItem n1 = new MenuItem();
            n1.setName("Chicken Sandwich"); n1.setPrice(119); n1.setCategory("Sandwiches"); n1.setAvailable(true); n1.setDescription("Grilled chicken with mayo"); n1.setIsVeg(false); n1.setImageUrl(sandwichImg);

            MenuItem n2 = new MenuItem();
            n2.setName("Chicken Thali"); n2.setPrice(189); n2.setCategory("Lunch Meals"); n2.setAvailable(true); n2.setDescription("Rice, curry and grilled chicken"); n2.setIsVeg(false); n2.setImageUrl(lunchImg);

            MenuItem n3 = new MenuItem();
            n3.setName("Fried Chicken Pieces"); n3.setPrice(149); n3.setCategory("Sides"); n3.setAvailable(true); n3.setDescription("Crispy fried chicken"); n3.setIsVeg(false); n3.setImageUrl(sidesImg);

            // Save all
            menuRepository.save(i1); menuRepository.save(i2); menuRepository.save(i3); menuRepository.save(i4);
            menuRepository.save(i5); menuRepository.save(i6); menuRepository.save(i7); menuRepository.save(i8);
            menuRepository.save(i9); menuRepository.save(i10); menuRepository.save(i11); menuRepository.save(i12); menuRepository.save(i13);
            menuRepository.save(i14); menuRepository.save(i15);
            menuRepository.save(i16); menuRepository.save(i17); menuRepository.save(i18); menuRepository.save(i19);
            menuRepository.save(i20); menuRepository.save(i21); menuRepository.save(i22); menuRepository.save(i23); menuRepository.save(i24); menuRepository.save(i25);
            menuRepository.save(n1); menuRepository.save(n2); menuRepository.save(n3);

            log.info("Seeded Bro & Bro menu (replaced existing items)");
        } catch (Exception ex) {
            log.error("Failed to seed menu", ex);
        }
    }
}
