package com.broandbro.qrapp.demodata;

import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.enums.*;
import com.broandbro.qrapp.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/**
 * Runtime-only demo fixture. It is deliberately not a Flyway migration.
 * The manifest is the sole source of truth for cleanup ownership.
 */
@Service
@Profile({"dev", "local", "prod"})
public class DemoDataService {
    public static final String MARKER = "BRO_DEMO_2026_01";
    private static final String DEMO_PASSWORD = "demo-only-password";
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final LocationRepository locations;
    private final PartnerRepository partners;
    private final PartnerLocationRepository partnerLocations;
    private final UserRepository users;
    private final PartnerUserRepository partnerUsers;
    private final UserLocationAccessRepository accesses;
    private final CategoryRepository categories;
    private final ProductRepository products;
    private final MenuRepository menu;
    private final VendorRepository vendors;
    private final LocationProductRepository locationProducts;
    private final ProductInventoryRepository inventories;
    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final String allowedIdentities;
    private final String profile;
    private final boolean enabled;
    private final boolean productionApproved;

    @Autowired
    public DemoDataService(JdbcTemplate jdbc, PasswordEncoder encoder, LocationRepository locations,
                           PartnerRepository partners, PartnerLocationRepository partnerLocations,
                           UserRepository users, UserLocationAccessRepository accesses,
                           PartnerUserRepository partnerUsers,
                           CategoryRepository categories, ProductRepository products, MenuRepository menu,
                           VendorRepository vendors, LocationProductRepository locationProducts,
                           ProductInventoryRepository inventories, OrderRepository orders,
                           OrderItemRepository orderItems,
                           @Value("${app.demo-seed.allowed-database-identities:}") String allowedIdentities,
                           @Value("${spring.profiles.active:}") String profile,
                           @Value("${app.demo-seed.enabled:false}") boolean enabled,
                           @Value("${app.demo-seed.production-approved:false}") boolean productionApproved) {
        this.jdbc = jdbc; this.encoder = encoder; this.locations = locations; this.partners = partners;
        this.partnerLocations = partnerLocations; this.users = users; this.accesses = accesses;
        this.partnerUsers = partnerUsers;
        this.categories = categories; this.products = products; this.menu = menu; this.vendors = vendors;
        this.locationProducts = locationProducts; this.inventories = inventories; this.orders = orders;
        this.orderItems = orderItems; this.allowedIdentities = allowedIdentities; this.profile = profile;
        this.enabled = enabled; this.productionApproved = productionApproved;
    }

    /** Compatibility constructor for callers that do not need partner membership fixtures. */
    public DemoDataService(JdbcTemplate jdbc, PasswordEncoder encoder, LocationRepository locations,
                           PartnerRepository partners, PartnerLocationRepository partnerLocations,
                           UserRepository users, UserLocationAccessRepository accesses,
                           CategoryRepository categories, ProductRepository products, MenuRepository menu,
                           VendorRepository vendors, LocationProductRepository locationProducts,
                           ProductInventoryRepository inventories, OrderRepository orders,
                           OrderItemRepository orderItems, String allowedIdentities, String profile,
                           boolean enabled) {
        this(jdbc, encoder, locations, partners, partnerLocations, users, accesses,
                null, categories, products, menu, vendors,
                locationProducts, inventories, orders, orderItems, allowedIdentities, profile, enabled, false);
    }

    private void guard() {
        if (!enabled) throw new IllegalStateException("Demo seed is disabled; set app.demo-seed.enabled=true");
        Set<String> activeProfiles = Arrays.stream(profile.split(",")).map(String::trim)
                .filter(p -> !p.isBlank()).collect(java.util.stream.Collectors.toSet());
        boolean productionProfile = activeProfiles.stream()
                .anyMatch(p -> p.equals("prod") || p.equals("production"));
        if (productionProfile && !productionApproved)
            throw new IllegalStateException("Demo seed requires explicit production approval");
        if (!productionProfile && activeProfiles.stream().noneMatch(p -> p.equals("dev") || p.equals("local")))
            throw new IllegalStateException("Demo seed requires the dev, local, or explicitly approved prod profile");
        String identity = jdbc.queryForObject("select current_database() || '/' || current_user", String.class);
        Set<String> allow = Arrays.stream(allowedIdentities.split(",")).map(String::trim).filter(s -> !s.isBlank()).collect(java.util.stream.Collectors.toSet());
        if (identity == null || !allow.contains(identity))
            throw new IllegalStateException("Database identity is not allowlisted for demo data: " + identity);
        jdbc.execute("""
            create table if not exists app_demo_fixture_manifest (
              marker varchar(80) not null, stable_key varchar(160) not null,
              entity_type varchar(80) not null, entity_id bigint not null,
              created_at timestamptz not null default current_timestamp,
              primary key (marker, stable_key)
            )""");
    }

    @Transactional
    public Map<String, Object> setup() { guard(); repairVendorIdentitySequence(); return seed(); }

    @Transactional
    public Map<String, Object> reseed() { guard(); repairVendorIdentitySequence(); cleanupInternal(); return seed(); }

    @Transactional
    public Map<String, Object> cleanup() { guard(); cleanupInternal(); return verifyInternal(); }

    @Transactional(readOnly = true)
    public Map<String, Object> verify() { guard(); return verifyInternal(); }

    private void repairVendorIdentitySequence() {
        String sequence = jdbc.queryForObject(
                "select pg_get_serial_sequence('vendor', 'id')",
                String.class);
        if (sequence == null) return;

        Long nextId = jdbc.queryForObject(
                "select coalesce(max(id), 0) + 1 from vendor",
                Long.class);
        jdbc.queryForObject("select setval(?::regclass, ?, false)", Long.class, sequence, nextId);
    }

    private Long owned(String key) {
        List<Long> ids = jdbc.query("select entity_id from app_demo_fixture_manifest where marker=? and stable_key=?",
                (r, n) -> r.getLong(1), MARKER, key);
        return ids.isEmpty() ? null : ids.get(0);
    }
    private void own(String key, String type, Long id) {
        jdbc.update("insert into app_demo_fixture_manifest(marker,stable_key,entity_type,entity_id) values (?,?,?,?)",
                MARKER, key, type, id);
    }
    private <T> T existing(String key, Class<T> type, java.util.function.Function<Long, Optional<T>> finder) {
        Long id = owned(key); return id == null ? null : finder.apply(id).orElseThrow(
                () -> new IllegalStateException("Manifest points to missing " + type.getSimpleName() + ": " + key));
    }
    private <T> T save(String key, String type, T value, java.util.function.Function<T, T> saver) {
        T old = existing(key, (Class<T>) value.getClass(), id -> Optional.empty());
        if (old != null) return old;
        T saved = saver.apply(value); own(key, type, idOf(saved)); return saved;
    }
    private Long idOf(Object entity) {
        try { return (Long) entity.getClass().getMethod("getId").invoke(entity); }
        catch (Exception e) { throw new IllegalStateException("Fixture entity has no id", e); }
    }

    private Map<String, Object> seed() {
        Location l = existing("location", Location.class, locations::findById);
        if (l == null) { l = Location.builder().code("BRO_DEMO_01").name("Bro & Bro Partner Demo Centre")
                .address("100 Synthetic Demo Street").city("Bengaluru").stateUt("Karnataka").country("India").pinCode("560001").active(true).build();
            l = locations.save(l); own("location","locations",l.getId()); }
        final Location location = l;
        Partner p = existing("partner", Partner.class, partners::findById);
        if (p == null) { p = Partner.builder().partnerCode("BRO-DEMO-PARTNER").legalName("Bro & Bro Demo Partner LLP")
                .displayName("Bro & Bro Partner Demo").primaryContactName("Demo Operator")
                .primaryContactEmail("demo@example.invalid").primaryContactPhone("9000000001").city("Bengaluru").state("Karnataka").build();
            p = partners.save(p); own("partner","partner",p.getId()); }
        final Partner partner = p;
        if (owned("partner-location") == null) {
            PartnerLocation pl = PartnerLocation.builder().partner(partner).location(location)
                    .effectiveFrom(LocalDate.now().minusMonths(3)).createdBy("demo-fixture").updatedBy("demo-fixture").build();
            pl = partnerLocations.save(pl); own("partner-location","partner_location",pl.getId());
        }
        Location secondLocation = existing("location-2", Location.class, locations::findById);
        if (secondLocation == null) {
            secondLocation = Location.builder().code("BRO_DEMO_02").name("UrbanWrk Demo Annex")
                    .address("200 Synthetic Demo Street").city("Bengaluru").stateUt("Karnataka")
                    .country("India").pinCode("560002").active(true).build();
            secondLocation = locations.save(secondLocation);
            own("location-2", "locations", secondLocation.getId());
        }
        if (owned("partner-location-2") == null) {
            PartnerLocation pl = PartnerLocation.builder().partner(partner).location(secondLocation)
                    .effectiveFrom(LocalDate.now().minusMonths(3)).createdBy("demo-fixture").updatedBy("demo-fixture").build();
            pl = partnerLocations.save(pl); own("partner-location-2", "partner_location", pl.getId());
        }
        User partnerAdmin = partnerUser("partner-admin", "9000000021", "Demo Partner Admin",
                UserRole.PARTNER_ADMIN, partner, location);
        User partnerUser = partnerUser("partner-user", "9000000022", "Demo Partner User",
                UserRole.PARTNER_USER, partner, location);
        locationAccess("partner-admin-location-2-access", partnerAdmin, secondLocation, UserRole.PARTNER_ADMIN);
        locationAccess("partner-user-location-2-access", partnerUser, secondLocation, UserRole.PARTNER_USER);
        List<User> demoUsers = new ArrayList<>();
        for (int i=1;i<=3;i++) {
            String key="user-"+i, phone="90000000"+(10+i);
            User u=existing(key,User.class,users::findById);
            if(u==null){u=User.builder().phone(phone).password(encoder.encode(DEMO_PASSWORD))
                    .name("Demo Customer "+i).role(UserRole.CUSTOMER).defaultLocation(location).termsAccepted(true).active(true).build();
                u=users.save(u);own(key,"users",u.getId());}
            else { u.setPassword(encoder.encode(DEMO_PASSWORD)); users.save(u); }
            demoUsers.add(u);
            if (owned("access-"+i)==null) { UserLocationAccess a=UserLocationAccess.builder().user(u).location(location).role(UserRole.CUSTOMER).active(true).build(); a=accesses.save(a); own("access-"+i,"user_location_access",a.getId()); }
        }
        Category breakfast = category("category-breakfast","Breakfast & Tiffin",location,1);
        Category dosa = category("category-dosa","Dosa & Idli",location,2);
        Category paratha = category("category-paratha","Paratha",location,3);
        Category meals = category("category-meals","Meals & Rice",location,4);
        Category snacks = category("category-snacks","Snacks & Packaged",location,5);
        Category beverages = category("category-beverages","Drinks & Milkshakes",location,6);
        Category desserts = category("category-desserts","Desserts",location,7);
        Vendor v1=vendor("vendor-1","Demo Kitchen Vendor","9000000011");
        Vendor v2=vendor("vendor-2","Demo Bakery Vendor","9000000012");
        Vendor v3=vendor("vendor-3","Demo Beverage Stall","9000000013");
        MenuItem m1=menuItem("menu-coffee","Demo Filter Coffee",beverages,location,v3,new BigDecimal("80.00"),"SKU-DEMO-COFFEE");
        MenuItem m2=menuItem("menu-meal","Demo Masala Bowl",meals,location,v1,new BigDecimal("220.00"),"SKU-DEMO-BOWL");
        MenuItem m3=menuItem("menu-bake","Demo Millet Bake",snacks,location,v2,new BigDecimal("160.00"),"SKU-DEMO-BAKE");
        MenuItem m4=menuItem("menu-idli","Demo Idli Sambar",dosa,location,v1,new BigDecimal("110.00"),"SKU-DEMO-IDLI");
        MenuItem m5=menuItem("menu-paratha","Demo Paneer Paratha",paratha,location,v1,new BigDecimal("145.00"),"SKU-DEMO-PARATHA");
        MenuItem m6=menuItem("menu-breakfast","Demo Breakfast Combo",breakfast,location,v1,new BigDecimal("185.00"),"SKU-DEMO-BREAKFAST");
        MenuItem m7=menuItem("menu-shake","Demo Mango Milkshake",beverages,location,v3,new BigDecimal("130.00"),"SKU-DEMO-SHAKE");
        MenuItem m8=menuItem("menu-dessert","Demo Jaggery Payasam",desserts,location,v2,new BigDecimal("95.00"),"SKU-DEMO-PAYASAM");
        Category secondBreakfast = category("category-2-breakfast","Breakfast & Tiffin",secondLocation,1);
        Category secondDosa = category("category-2-dosa","Dosa & Idli",secondLocation,2);
        Category secondMeals = category("category-2-meals","Meals & Rice",secondLocation,3);
        Category secondSnacks = category("category-2-snacks","Snacks & Packaged",secondLocation,4);
        Category secondBeverages = category("category-2-beverages","Drinks & Milkshakes",secondLocation,5);
        Category secondDesserts = category("category-2-desserts","Desserts",secondLocation,6);
        MenuItem m9 = menuItem("menu-2-coffee","Demo Filter Coffee",secondBeverages,secondLocation,v3,
                new BigDecimal("80.00"),"SKU-DEMO-2-COFFEE");
        MenuItem m10 = menuItem("menu-2-meal","Demo Masala Bowl",secondMeals,secondLocation,v1,
                new BigDecimal("220.00"),"SKU-DEMO-2-BOWL");
        MenuItem m11 = menuItem("menu-2-bake","Demo Millet Bake",secondSnacks,secondLocation,v2,
                new BigDecimal("160.00"),"SKU-DEMO-2-BAKE");
        MenuItem m12 = menuItem("menu-2-idli","Demo Idli Sambar",secondDosa,secondLocation,v1,
                new BigDecimal("110.00"),"SKU-DEMO-2-IDLI");
        MenuItem m13 = menuItem("menu-2-breakfast","Demo Breakfast Combo",secondBreakfast,secondLocation,v1,
                new BigDecimal("185.00"),"SKU-DEMO-2-BREAKFAST");
        MenuItem m14 = menuItem("menu-2-shake","Demo Mango Milkshake",secondBeverages,secondLocation,v3,
                new BigDecimal("130.00"),"SKU-DEMO-2-SHAKE");
        MenuItem m15 = menuItem("menu-2-dessert","Demo Jaggery Payasam",secondDesserts,secondLocation,v2,
                new BigDecimal("95.00"),"SKU-DEMO-2-PAYASAM");
        for (int i=1;i<=3;i++) {
            Product product = product("product-"+i, i==1?"Demo Coffee Beans":i==2?"Demo Bowl Ingredients":"Demo Millet Flour", i);
            LocationProduct lp=locationProducts.findByProductIdAndLocationId(product.getId(),location.getId()).orElse(null);
            if(lp==null){lp=new LocationProduct();lp.setProduct(product);lp.setLocation(location);lp.setSellingPrice(new BigDecimal(i==1?"80":"160"));lp=locationProducts.save(lp);own("location-product-"+i,"location_product",lp.getId());}
            if(inventories.findByLocationProductId(lp.getId()).isEmpty()){ProductInventory inv=new ProductInventory();inv.setLocationProduct(lp);inv.setAvailableQuantity(i == 1 ? 65L : i == 2 ? 4L : 0L);inv.setReservedQuantity(0L);inv=inventories.save(inv);own("inventory-"+i,"product_inventory",inv.getId());}
        }
        List<MenuItem> orderMenu = List.of(m1, m2, m3, m4, m5, m6, m7, m8);
        List<User> orderUsers = List.of(demoUsers.get(0), demoUsers.get(1), demoUsers.get(2), partnerAdmin, partnerUser);
        Random random = new Random(20261013L);
        for (int i = 1; i <= 9000; i++) {
            User orderUser = orderUsers.get((i - 1) % orderUsers.size());
            OrderStatus status = random.nextInt(20) == 0 ? OrderStatus.CANCELLED : OrderStatus.COMPLETED;
            MenuItem first = orderMenu.get(random.nextInt(orderMenu.size()));
            MenuItem second = orderMenu.get(random.nextInt(orderMenu.size()));
            int daysAgo = random.nextInt(90);
            order("order-" + i, orderUser, location, status, PaymentMethod.PAY_AT_STALL, daysAgo,
                    line(first, 1 + random.nextInt(3), randomPrice(first, random)),
                    line(second, 1 + random.nextInt(2), randomPrice(second, random)));
        }
        List<MenuItem> secondOrderMenu = List.of(m9, m10, m11, m12, m13, m14, m15);
        Random secondRandom = new Random(20261014L);
        for (int i = 1; i <= 7000; i++) {
            User orderUser = orderUsers.get((i - 1) % orderUsers.size());
            OrderStatus status = secondRandom.nextInt(20) == 0 ? OrderStatus.CANCELLED : OrderStatus.COMPLETED;
            MenuItem first = secondOrderMenu.get(secondRandom.nextInt(secondOrderMenu.size()));
            MenuItem second = secondOrderMenu.get(secondRandom.nextInt(secondOrderMenu.size()));
            order("location-2-order-" + i, orderUser, secondLocation, status,
                    PaymentMethod.PAY_AT_STALL, secondRandom.nextInt(90),
                    line(first, 1 + secondRandom.nextInt(3), randomPrice(first, secondRandom)),
                    line(second, 1 + secondRandom.nextInt(2), randomPrice(second, secondRandom)));
        }
        return verifyInternal();
    }

    private User partnerUser(String key, String phone, String name, UserRole role,
                             Partner partner, Location location) {
        User u = existing(key, User.class, users::findById);
        if (u == null) {
            u = User.builder().phone(phone).password(encoder.encode(DEMO_PASSWORD))
                    .name(name).role(role).defaultLocation(location).termsAccepted(true).active(true)
                    .build();
            u = users.save(u);
            own(key, "users", u.getId());
        } else { u.setPassword(encoder.encode(DEMO_PASSWORD)); users.save(u); }
        if (partnerUsers != null && owned(key + "-membership") == null) {
            PartnerUser membership = PartnerUser.builder().partner(partner).user(u).active(true)
                    .createdBy("demo-fixture").updatedBy("demo-fixture").build();
            membership = partnerUsers.save(membership);
            own(key + "-membership", "partner_user", membership.getId());
        }
        if (owned(key + "-access") == null) {
            UserLocationAccess access = UserLocationAccess.builder().user(u).location(location)
                    .role(role).active(true).build();
            access = accesses.save(access);
            own(key + "-access", "user_location_access", access.getId());
        }
        return u;
    }

    private void locationAccess(String key, User user, Location location, UserRole role) {
        if (owned(key) == null) {
            UserLocationAccess access = UserLocationAccess.builder().user(user).location(location)
                    .role(role).active(true).build();
            access = accesses.save(access);
            own(key, "user_location_access", access.getId());
        }
    }

    private Category category(String key,String name,Location l,int order){Category c=existing(key,Category.class,categories::findById);if(c==null){c=new Category();c.setName(name);c.setLocation(l);c.setDisplayOrder(order);c=categories.save(c);own(key,"category",c.getId());}return c;}
    private Vendor vendor(String key,String name,String phone){Vendor v=existing(key,Vendor.class,vendors::findById);if(v==null){v=new Vendor();v.setVendorName(name);v.setPhoneNumber(phone);v=vendors.save(v);own(key,"vendor",v.getId());}return v;}
    private Product product(String key,String name,int n){Product p=existing(key,Product.class,products::findById);if(p==null){p=new Product();p.setSku("DEMO-P-"+n);p.setName(name);p.setMrp(new BigDecimal("100"));p.setCostPrice(new BigDecimal("40"));p.setActive(true);p=products.save(p);own(key,"product_master",p.getId());}return p;}
    private MenuItem menuItem(String key,String name,Category c,Location l,Vendor v,BigDecimal price,String sku){MenuItem m=existing(key,MenuItem.class,menu::findById);if(m==null){m=new MenuItem();m.setName(name);m.setCategory(c);m.setLocation(l);m.setVendor(v);m.setMrp(price);m.setPurchaseCost(price.multiply(new BigDecimal(".5")));m.setSkuCode(sku);m.setProductType(ProductType.PREPARED_FOOD);m.setAvailable(true);m.setIsDeleted(false);m=menu.save(m);own(key,"menu_item",m.getId());}return m;}
    private Line line(MenuItem item, int quantity) {
        return new Line(item, quantity, item.getMrp());
    }

    private Line line(MenuItem item, int quantity, BigDecimal unitPrice) {
        return new Line(item, quantity, unitPrice);
    }

    private BigDecimal randomPrice(MenuItem item, Random random) {
        BigDecimal multiplier = BigDecimal.valueOf(0.90 + random.nextDouble() * 0.40);
        return item.getMrp().multiply(multiplier).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private void order(String key, User u, Location l, OrderStatus status, PaymentMethod pm,
                       int days, Line... lines) {
        Order o = existing(key, Order.class, orders::findById);
        if (o != null) return;
        LocalDateTime at = LocalDateTime.now().minusDays(days);
        BigDecimal subtotal = Arrays.stream(lines)
                .map(line -> line.unitPrice.multiply(BigDecimal.valueOf(line.quantity)))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal tax = Arrays.stream(lines)
                .map(line -> line.unitPrice.multiply(BigDecimal.valueOf(line.quantity))
                        .multiply(new BigDecimal("0.05"))
                        .setScale(2, java.math.RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        o = new Order();
        String fixtureKey = key.toUpperCase(Locale.ROOT).replace('-', '_');
        o.setOrderNumber(String.format("%s-%s-%s-0001", l.getCode(), fixtureKey,
                at.format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE)));
        o.setLocationCode(l.getCode());
        o.setLocation(l);
        o.setUserId(u.getId());
        o.setPhone(u.getPhone());
        o.setStatus(status);
        o.setPaymentMethod(pm);
        o.setPaymentStatus(status == OrderStatus.CANCELLED ? "CANCELLED" : "PAID");
        o.setCreatedAt(at);
        o.setLastStatusChangedAt(at.plusMinutes(20));
        o.setCompletedAt(status == OrderStatus.COMPLETED ? at.plusMinutes(22) : null);
        o.setSubtotal(subtotal);
        o.setTax(tax);
        o.setGrandTotal(subtotal.add(tax));
        o = orders.save(o);
        own(key, "orders", o.getId());
        BigDecimal accumulatedTax = BigDecimal.ZERO;
        for (int n = 0; n < lines.length; n++) {
            Line line = lines[n];
            BigDecimal lineTotal = line.unitPrice.multiply(BigDecimal.valueOf(line.quantity));
            BigDecimal lineTax = lineTotal.multiply(new BigDecimal("0.05"))
                    .setScale(2, java.math.RoundingMode.HALF_UP);
            accumulatedTax = accumulatedTax.add(lineTax);
            OrderItem item = new OrderItem();
            item.setOrderId(o.getId());
            item.setItemId(line.item.getId());
            item.setQuantity(line.quantity);
            item.setSellingPriceSnapshot(line.unitPrice);
            item.setCostPriceSnapshot(line.item.getPurchaseCost());
            item.setProfitSnapshot(line.unitPrice.subtract(line.item.getPurchaseCost()));
            item.setLineTotal(lineTotal);
            item.setUnitBasePrice(line.unitPrice);
            item.setGrossBaseAmount(lineTotal);
            item.setTaxableAmount(lineTotal);
            item.setGstRate(new BigDecimal("5.0000"));
            item.setCgstRate(new BigDecimal("2.5000"));
            item.setCgstAmount(lineTax.divide(new BigDecimal("2"), 2, java.math.RoundingMode.HALF_UP));
            item.setSgstRate(new BigDecimal("2.5000"));
            item.setSgstAmount(lineTax.subtract(item.getCgstAmount()));
            item.setTotalTax(lineTax);
            item.setUnitCustomerPrice(line.unitPrice.multiply(new BigDecimal("1.05"))
                    .setScale(2, java.math.RoundingMode.HALF_UP));
            item.setTotalCustomerPrice(lineTotal.add(lineTax));
            item = orderItems.save(item);
            own(key + "-item-" + n, "order_item", item.getId());
        }
        if (accumulatedTax.compareTo(tax) != 0) {
            throw new IllegalStateException("Demo order tax snapshot is inconsistent: " + key);
        }
    }

    private static final class Line {
        private final MenuItem item;
        private final int quantity;
        private final BigDecimal unitPrice;
        private Line(MenuItem item, int quantity, BigDecimal unitPrice) {
            this.item = item;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
        }
    }

    private void cleanupInternal() {
        jdbc.update("delete from analytics_daily_sales where location_id in " +
                "(select entity_id from app_demo_fixture_manifest where marker=? and entity_type='locations')", MARKER);
        jdbc.update("delete from analytics_hourly_orders where location_id in " +
                "(select entity_id from app_demo_fixture_manifest where marker=? and entity_type='locations')", MARKER);
        jdbc.update("delete from analytics_menu_item where location_id in " +
                "(select entity_id from app_demo_fixture_manifest where marker=? and entity_type='locations')", MARKER);
        jdbc.update("delete from analytics_coupon where location_id in " +
                "(select entity_id from app_demo_fixture_manifest where marker=? and entity_type='locations')", MARKER);
        jdbc.query("select entity_type,entity_id from app_demo_fixture_manifest where marker=? order by case entity_type " +
                "when 'order_item' then 1 when 'orders' then 2 when 'user_location_access' then 3 " +
                "when 'product_inventory' then 4 when 'location_product' then 5 when 'menu_item' then 6 " +
                "when 'category' then 7 when 'partner_location' then 8 when 'product_master' then 9 " +
                "when 'vendor' then 10 when 'partner_user' then 11 when 'partner' then 12 " +
                "when 'users' then 13 when 'locations' then 14 else 99 end",
                (r,n)->{jdbc.update("delete from "+safeTable(r.getString(1))+" where id=?",r.getLong(2));return null;}, MARKER);
        jdbc.update("delete from app_demo_fixture_manifest where marker=?",MARKER);
    }
    private String safeTable(String type){return switch(type){case "order_item"->"order_item";case "orders"->"orders";case "user_location_access"->"user_location_access";case "product_inventory"->"product_inventory";case "location_product"->"location_product";case "menu_item"->"menu_item";case "category"->"category";case "product_master"->"product_master";case "vendor"->"vendor";case "partner_user"->"partner_user";case "partner_location"->"partner_location";case "partner"->"partner";case "users"->"users";case "locations"->"locations";default->throw new IllegalArgumentException("Unknown fixture type");};}
    private Map<String,Object> verifyInternal(){
        long count=jdbc.queryForObject("select count(*) from app_demo_fixture_manifest where marker=?",Long.class,MARKER);
        Map<String, Long> counts = new LinkedHashMap<>();
        jdbc.query("select entity_type,count(*) from app_demo_fixture_manifest where marker=? group by entity_type order by entity_type",
                (rs, ignored) -> { counts.put(rs.getString(1), rs.getLong(2)); return null; }, MARKER);
        return Map.of("marker",MARKER,"ownedRecords",count,"counts",counts,"locationCode","BRO_DEMO_01",
                "safeExternalSideEffects",false,
                "unsupportedDerivedDomains",List.of("invoices","settlements","notifications","payment webhooks"));
    }
}
