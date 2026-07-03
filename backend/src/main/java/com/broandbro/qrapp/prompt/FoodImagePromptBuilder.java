package com.broandbro.qrapp.prompt;

import com.broandbro.qrapp.exception.InvalidPromptException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Builds appearance-first AI image prompts for menu items.
 *
 * <p>Design principles:
 * <ol>
 *   <li><b>Description</b> – highest priority; explicit visual details from the admin</li>
 *   <li><b>Dish name</b> – drives the core visual identity ("Peanut Butter Toast" → toast + spread)</li>
 *   <li><b>Category</b> – cuisine style / plating context</li>
 *   <li><b>Veg flag</b> – lowest weight; ONLY controls ingredient restrictions, never visual appearance</li>
 * </ol>
 *
 * <p>The veg flag NEVER injects visual assumptions (no green indicators, no vegetables, no greens).
 * "Peanut Butter Toast" is vegetarian but looks like toasted bread + spread, not a salad.
 */
@Component
@Slf4j
public class FoodImagePromptBuilder {

    // -------------------------------------------------------------------------
    // Blocked content
    // -------------------------------------------------------------------------

    private static final Set<String> BLOCKED_TERMS = Set.of(
            "nude", "naked", "violence", "gore", "blood", "weapon", "drug"
    );

    // -------------------------------------------------------------------------
    // Dish-type → visual appearance mapping
    // Drives what the image actually LOOKS like.
    // -------------------------------------------------------------------------

    private static final List<DishProfile> DISH_PROFILES = List.of(
        new DishProfile(Set.of("toast", "toasted bread"),
            "golden brown toasted bread slices, crispy edges, warm texture"),
        new DishProfile(Set.of("sandwich"),
            "stacked sandwich on a wooden board, toasted bread layers, cross-section visible"),
        new DishProfile(Set.of("burger"),
            "towering gourmet burger, sesame bun, juicy patty, stacked layers, side of fries"),
        new DishProfile(Set.of("pizza"),
            "wood-fired pizza with bubbling cheese, crispy crust, melted toppings, rustic stone backdrop"),
        new DishProfile(Set.of("pasta"),
            "creamy pasta in a white bowl, ribbons of pasta, rich sauce coating, fork twirl"),
        new DishProfile(Set.of("biryani"),
            "aromatic biryani in a copper handi, saffron-tinted rice, dum steam, garnished with caramelised onions"),
        new DishProfile(Set.of("dosa"),
            "crispy golden dosa rolled on a banana leaf, with sambar bowl and chutneys alongside"),
        new DishProfile(Set.of("idli"),
            "soft white idlis on a banana leaf, sambar and coconut chutney on the side"),
        new DishProfile(Set.of("cake"),
            "layered celebration cake, smooth frosting, elegant slice revealing moist crumb"),
        new DishProfile(Set.of("brownie"),
            "fudgy chocolate brownie square, crackly top, melted chocolate drizzle, dusted with cocoa"),
        new DishProfile(Set.of("coffee", "latte", "cappuccino", "espresso"),
            "steaming coffee in a ceramic cup, latte art on creamy foam, warm moody lighting"),
        new DishProfile(Set.of("tea", "chai"),
            "hot tea in a glass or cup, amber liquid, wisps of steam"),
        new DishProfile(Set.of("smoothie", "shake", "milkshake"),
            "thick smoothie or milkshake in a tall glass, garnished rim, vibrant colour"),
        new DishProfile(Set.of("juice"),
            "fresh juice in a highball glass, condensation on glass, ice cubes, fruit slice on rim"),
        new DishProfile(Set.of("soup"),
            "steaming bowl of soup, rich broth, ladle alongside, rustic bowl on dark surface"),
        new DishProfile(Set.of("salad"),
            "colourful salad in a wide bowl, mixed textures, light vinaigrette glistening on leaves"),
        new DishProfile(Set.of("curry", "masala", "gravy"),
            "rich curry in a black iron bowl, thick aromatic sauce, steam rising, garnished with cream swirl"),
        new DishProfile(Set.of("rice"),
            "fluffy steamed rice mounded in a bowl, glossy grains, light steam"),
        new DishProfile(Set.of("noodles", "ramen", "pho"),
            "noodle bowl with broth, tangle of noodles, toppings arranged artfully"),
        new DishProfile(Set.of("fries", "chips"),
            "crispy golden fries piled in a paper cone or basket, sea salt flakes visible"),
        new DishProfile(Set.of("roll", "wrap"),
            "tightly rolled wrap sliced on a bias, fillings visible at the cut end"),
        new DishProfile(Set.of("paneer"),
            "golden paneer cubes in thick gravy, glossy sauce, topped with cream and fresh coriander"),
        new DishProfile(Set.of("chicken", "butter chicken"),
            "tender chicken in rich sauce, glistening colour, served in a black bowl"),
        new DishProfile(Set.of("fish", "prawn", "seafood"),
            "grilled or curried seafood, caramelised exterior, plated on a slate"),
        new DishProfile(Set.of("waffle"),
            "golden waffle on a plate, crisp grid texture, maple syrup pool, butter pat melting"),
        new DishProfile(Set.of("pancake"),
            "stack of fluffy pancakes, maple syrup dripping down the sides, powdered sugar dusting"),
        new DishProfile(Set.of("ice cream", "gelato"),
            "scoops of ice cream in a waffle cone or cup, creamy texture, slight melt"),
        new DishProfile(Set.of("oat", "oatmeal", "porridge"),
            "warm oat bowl, creamy porridge texture, toppings arranged on top, steam rising"),
        new DishProfile(Set.of("egg", "omelette", "scrambled"),
            "perfectly cooked eggs on a plate, glossy surface, seasoned appearance"),
        new DishProfile(Set.of("kebab", "tikka"),
            "chargrilled skewers with char marks, smoky appearance, plated with sauces")
    );

    // -------------------------------------------------------------------------
    // Dish types that should NEVER have greens/vegetables auto-injected
    // -------------------------------------------------------------------------

    private static final Set<String> NO_GREENS_INJECTION = Set.of(
            "toast", "sandwich", "pizza", "pasta", "biryani", "dosa", "burger",
            "cake", "brownie", "coffee", "tea", "chai", "waffle", "pancake",
            "fries", "chips", "ice cream", "gelato", "oat", "oatmeal",
            "cookie", "muffin", "bread", "naan", "roti", "paratha"
    );

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    public String buildFoodImagePrompt(String menuItemName, String categoryName, Boolean isVeg) {
        return buildFoodImagePrompt(menuItemName, categoryName, isVeg, null, null);
    }

    public String buildFoodImagePrompt(String menuItemName, String categoryName, Boolean isVeg,
                                       String description) {
        return buildFoodImagePrompt(menuItemName, categoryName, isVeg, description, null);
    }

    /**
     * Main prompt builder.
     *
     * <p>Priority order:
     * <ol>
     *   <li>Description visual keywords (highest)</li>
     *   <li>Dish-name appearance profile</li>
     *   <li>Category / cuisine style</li>
     *   <li>Ingredient restriction from veg flag (lowest — NEVER visual)</li>
     *   <li>Admin additional hint (inserted just before style qualifiers)</li>
     * </ol>
     */
    public String buildFoodImagePrompt(String menuItemName, String categoryName, Boolean isVeg,
                                       String description, String additionalPrompt) {
        validateInputs(menuItemName, categoryName);

        String nameLower = menuItemName.toLowerCase();

        // 1. Description → extract concrete visual keywords (highest priority)
        String descriptionVisuals = extractDescriptionVisuals(description, nameLower);

        // 2. Dish-name → appearance profile
        String dishAppearance = resolveDishAppearance(nameLower);

        // 3. Category → cuisine / plating style
        String cuisineStyle = buildCuisineStyle(categoryName);

        // 4. Veg flag → ONLY ingredient restrictions, zero visual assumptions
        String ingredientRestriction = buildIngredientRestriction(isVeg);

        // 5. Admin hint
        String extraHint = (additionalPrompt != null && !additionalPrompt.isBlank())
                ? additionalPrompt.trim() + ", "
                : "";

        // Compose: description first so it overrides defaults, then dish, then category, then restriction, then hint
        StringBuilder visual = new StringBuilder();
        if (!descriptionVisuals.isBlank())  visual.append(descriptionVisuals).append(", ");
        if (!dishAppearance.isBlank())       visual.append(dishAppearance).append(", ");
        if (!cuisineStyle.isBlank())         visual.append(cuisineStyle).append(", ");
        if (!ingredientRestriction.isBlank()) visual.append(ingredientRestriction).append(", ");
        if (!extraHint.isBlank())            visual.append(extraHint);

        String prompt = String.format(
                "Professional restaurant food photography of %s, %s" +
                "ultra realistic, cinematic lighting, premium plating on a dark slate or wooden surface, " +
                "shallow depth of field with soft bokeh background, " +
                "commercial food advertisement quality, 4K resolution, high detail, " +
                "shot with an 85mm lens by a professional food photographer",
                menuItemName.trim(),
                visual
        );

        // Self-check: would a customer recognise this dish?
        if (!passesRecognitionCheck(nameLower, prompt)) {
            log.warn("[PromptBuilder] Recognition check failed for '{}'. Prompt may not match dish appearance.", menuItemName);
        }

        log.debug("[PromptBuilder] Final prompt for '{}': {}", menuItemName, prompt);
        return prompt;
    }

    public String buildFoodImagePrompt(String menuItemName, String categoryName) {
        return buildFoodImagePrompt(menuItemName, categoryName, null, null, null);
    }

    public String computePromptHash(String prompt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(prompt.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Returns a visual appearance description based on the dish name.
     * Falls back to empty string if no profile matches (category or name will cover it).
     */
    private String resolveDishAppearance(String nameLower) {
        for (DishProfile profile : DISH_PROFILES) {
            for (String keyword : profile.keywords()) {
                if (nameLower.contains(keyword)) {
                    return profile.appearance();
                }
            }
        }
        return ""; // No specific profile — dish name + category will carry the description
    }

    /**
     * Extracts visual/sensory keywords from the item description.
     * Prioritises cooking methods, textures, colours, and ingredient names.
     * Skips dietary labels and stop-words.
     *
     * NEVER injects greens/vegetables for dish types in NO_GREENS_INJECTION.
     */
    private String extractDescriptionVisuals(String description, String nameLower) {
        if (description == null || description.isBlank()) return "";

        boolean suppressGreens = NO_GREENS_INJECTION.stream().anyMatch(nameLower::contains);

        Set<String> stopWords = Set.of(
                "a", "an", "the", "is", "are", "was", "with", "and", "or", "of",
                "in", "on", "at", "to", "for", "it", "our", "your", "this", "that",
                "made", "from", "served", "comes", "each", "we", "you", "have",
                "has", "be", "by", "as", "its", "very", "also", "just", "only",
                // Dietary labels — must NOT become visual elements
                "vegetarian", "vegan", "non-vegetarian", "veg", "nonveg", "contains",
                "healthy", "organic", "natural", "fresh" // too generic
        );

        // Greens vocabulary — suppressed for bread/pastry/beverage type dishes
        Set<String> greensVocab = Set.of(
                "green", "greens", "salad", "lettuce", "spinach", "kale",
                "broccoli", "vegetable", "vegetables", "herb", "herbs", "leaf", "leaves"
        );

        String cleaned = description.replaceAll("[^a-zA-Z ]", " ").toLowerCase().trim();

        return Arrays.stream(cleaned.split("\\s+"))
                .filter(w -> w.length() > 3)
                .filter(w -> !stopWords.contains(w))
                .filter(w -> !suppressGreens || !greensVocab.contains(w))
                .distinct()
                .limit(8)
                .collect(Collectors.joining(", "));
    }

    /**
     * Returns cuisine / plating style context from category.
     * Focuses on presentation style, NOT dietary classification.
     */
    private String buildCuisineStyle(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) return "";

        return switch (categoryName.toLowerCase().trim()) {
            case "burgers", "burger"           -> "American diner style plating";
            case "pizza", "pizzas"             -> "Italian trattoria presentation";
            case "biryani", "rice dishes"      -> "South Asian dum-style serving, copper vessel";
            case "chinese", "noodles"          -> "East Asian bowl presentation";
            case "north indian", "curry"       -> "North Indian dhaba plating, iron kadai";
            case "south indian"                -> "South Indian banana leaf or steel plate";
            case "desserts", "sweets"          -> "patisserie-style dessert plating";
            case "ice cream", "gelato"         -> "creamery-style serving";
            case "beverages", "drinks"         -> "café-style beverage presentation";
            case "juices"                      -> "fresh juice bar presentation";
            case "sandwiches", "wraps"         -> "deli-style plating on wooden board";
            case "starters", "appetizers"      -> "tapas-style starter plating";
            case "breakfast"                   -> "breakfast café plating, morning light";
            case "snacks", "street food"       -> "street food rustic serving, paper or cane basket";
            case "pasta"                       -> "Italian ristorante pasta presentation";
            default                            -> categoryName + " style presentation";
        };
    }

    /**
     * Veg flag → ONLY controls ingredient language, NEVER visual appearance.
     * No green indicators. No "vegetarian dish" label. No visual garnish assumptions.
     */
    private String buildIngredientRestriction(Boolean isVeg) {
        if (Boolean.TRUE.equals(isVeg)) {
            // Only ensure no meat is mentioned — that's all
            return "no chicken no meat no seafood";
        }
        // Non-veg: no restriction needed — dish name/description will naturally include meat if relevant
        return "";
    }

    /**
     * Self-check: would a customer immediately recognise the dish from this prompt?
     * Returns false if the prompt contains no visual anchor matching the dish type.
     */
    private boolean passesRecognitionCheck(String nameLower, String prompt) {
        String promptLower = prompt.toLowerCase();
        // For known dish types, ensure at least one key visual word from the dish profile is in the prompt
        for (DishProfile profile : DISH_PROFILES) {
            for (String keyword : profile.keywords()) {
                if (nameLower.contains(keyword)) {
                    // Check if at least one appearance word is in the prompt
                    return Arrays.stream(profile.appearance().split("[,\\s]+"))
                            .filter(w -> w.length() > 3)
                            .anyMatch(promptLower::contains);
                }
            }
        }
        return true; // Unknown dish type — pass by default
    }

    private void validateInputs(String menuItemName, String categoryName) {
        if (menuItemName == null || menuItemName.isBlank()) {
            throw new InvalidPromptException("Menu item name must not be blank");
        }
        if (menuItemName.length() > 200) {
            throw new InvalidPromptException("Menu item name is too long (max 200 characters)");
        }
        String combined = (menuItemName + " " + (categoryName != null ? categoryName : "")).toLowerCase();
        for (String blocked : BLOCKED_TERMS) {
            if (combined.contains(blocked)) {
                throw new InvalidPromptException("Menu item name or category contains disallowed content");
            }
        }
    }

    // -------------------------------------------------------------------------
    // Inner record
    // -------------------------------------------------------------------------

    private record DishProfile(Set<String> keywords, String appearance) {}
}
