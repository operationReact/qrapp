package com.broandbro.qrapp.prompt;

import com.broandbro.qrapp.exception.InvalidPromptException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Set;

/**
 * Builds standardized, restaurant-quality AI image prompts for menu items.
 * Centralised here so the prompt style is consistent across all generation paths.
 * Designed for easy extension (multiple styles, social-media banners, combo posters, etc.).
 */
@Component
@Slf4j
public class FoodImagePromptBuilder {

    /** Basic profanity blocklist – extend as needed. */
    private static final Set<String> BLOCKED_TERMS = Set.of(
            "nude", "naked", "violence", "gore", "blood", "weapon", "drug"
    );

    /**
     * Builds a professional food photography prompt.
     *
     * @param menuItemName  Display name of the menu item (e.g. "Chicken Burger")
     * @param categoryName  Category / cuisine context (e.g. "Burgers", "North Indian")
     * @param isVeg         Whether the item is vegetarian
     * @return Full prompt string ready to send to OpenAI
     */
    public String buildFoodImagePrompt(String menuItemName, String categoryName, Boolean isVeg) {
        validateInputs(menuItemName, categoryName);

        String vegContext = Boolean.TRUE.equals(isVeg)
                ? "vegetarian dish,"
                : "";

        String cuisineContext = buildCuisineContext(categoryName);

        String prompt = String.format(
                "Professional restaurant food photography of %s, %s %s " +
                "ultra realistic, cinematic lighting, premium plating, " +
                "dark moody restaurant background, bokeh effect, " +
                "commercial food advertisement style, 4K, high detail, " +
                "shot with a 85mm lens, styled by a professional food stylist",
                menuItemName.trim(),
                vegContext,
                cuisineContext
        );

        log.debug("Built image prompt for '{}': {}", menuItemName, prompt);
        return prompt;
    }

    /**
     * Overload that infers veg status as unknown.
     */
    public String buildFoodImagePrompt(String menuItemName, String categoryName) {
        return buildFoodImagePrompt(menuItemName, categoryName, null);
    }

    /**
     * Computes a SHA-256 hash of the prompt for duplicate-detection and caching.
     */
    public String computePromptHash(String prompt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(prompt.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

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
                throw new InvalidPromptException(
                        "Menu item name or category contains disallowed content");
            }
        }
    }

    private String buildCuisineContext(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) {
            return "restaurant cuisine,";
        }

        return switch (categoryName.toLowerCase()) {
            case "burgers", "burger" -> "gourmet burger, American fast food style,";
            case "pizza", "pizzas" -> "Italian pizza, wood-fired style,";
            case "biryani", "rice" -> "South Asian cuisine, aromatic basmati rice,";
            case "chinese", "noodles" -> "Asian fusion cuisine,";
            case "north indian", "curry" -> "North Indian cuisine, rich curry,";
            case "south indian" -> "South Indian cuisine,";
            case "desserts", "sweets", "ice cream" -> "dessert plating, artisan sweet dish,";
            case "beverages", "drinks", "juices" -> "beverage photography, refreshing drink,";
            case "sandwiches", "wraps" -> "deli-style sandwich,";
            case "starters", "appetizers" -> "appetizer plating,";
            default -> categoryName + " cuisine,";
        };
    }
}

