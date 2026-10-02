package com.broandbro.qrapp.prompt;

import com.broandbro.qrapp.exception.InvalidPromptException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Builds AI image generation prompts for category food photographs.
 *
 * <p>Design principles:
 * <ol>
 *   <li><b>Food-first</b> – premium food photography is the entire image</li>
 *   <li><b>Square format</b> – 1:1 aspect for category tiles</li>
 *   <li><b>Recognizable at small size</b> – works as a category icon/thumb</li>
 *   <li><b>No text or UI</b> – category name will be rendered by frontend</li>
 *   <li><b>Premium presentation</b> – commercial food photography quality</li>
 * </ol>
 *
 * <p>The frontend will render the category name and icon fallback as needed.
 * This prompt generates ONLY the food photograph.
 */
@Component
@Slf4j
public class CategoryImagePromptBuilder {

    private static final Set<String> BLOCKED_TERMS = Set.of(
            "nude", "naked", "violence", "gore", "blood", "weapon", "drug",
            "text", "typography", "logo", "watermark", "ui ", "interface",
            "button", "label", "price", "rupees", "rs", "currency"
    );

    /**
     * Builds a premium category food photograph prompt.
     *
     * @param categoryName The category name (e.g. "Biryani", "Burgers", "Coffee")
     * @param description Optional category description for visual hints
     * @param creativeDirection Optional admin creative hint
     * @return AI-ready prompt text
     */
    public String buildCategoryFoodImagePrompt(String categoryName, String description, String creativeDirection) {
        validateInputs(categoryName);

        StringBuilder prompt = new StringBuilder();

        // Main instruction
        prompt.append("Create a premium professional food photograph for a \"").append(categoryName.trim()).append("\" category tile in a modern food-delivery app. ");

        // Context from description
        if (description != null && !description.isBlank()) {
            prompt.append("Category description: ").append(description.trim()).append(". ");
        }

        // Visual requirements
        prompt.append("Visual composition: ");
        prompt.append("A single appetizing representative dish or food item for this category. ");
        prompt.append("Square format (1:1 aspect ratio). ");
        prompt.append("Premium restaurant-quality food photography. ");
        prompt.append("Cinematic professional lighting, warm and inviting. ");
        prompt.append("Natural rich colours with realistic food textures. ");
        prompt.append("Shallow depth of field with soft blurred background. ");
        prompt.append("Main food subject centered and sharp, taking up 70-80% of the frame. ");
        prompt.append("Clean plating or serving presentation. ");
        prompt.append("Recognizable at thumbnail size (will be used as a ~150px tile icon). ");
        prompt.append("Ultra-realistic, high detail, 4K resolution. ");

        // Admin creative direction (optional)
        if (creativeDirection != null && !creativeDirection.isBlank()) {
            prompt.append("Creative direction: ").append(creativeDirection.trim()).append(". ");
        }

        // STRICT exclusions
        prompt.append("MUST NOT include: ");
        prompt.append("any text, numbers, typography, fonts, labels. ");
        prompt.append("any prices, currency symbols, or promotional text. ");
        prompt.append("any buttons, UI elements, navigation, app chrome. ");
        prompt.append("any logos, watermarks, or branding. ");
        prompt.append("multiple dishes (single item only). ");
        prompt.append("people, hands, or utensils visible. ");
        prompt.append("any artificial elements or mock-ups. ");

        // Final quality
        prompt.append("Deliver: ");
        prompt.append("Professional food-photography quality. ");
        prompt.append("Shot with a 85mm lens by a professional food photographer. ");
        prompt.append("High-end restaurant or food magazine photography style. ");
        prompt.append("suitable as a premium category thumbnail in a food-delivery app.");

        String finalPrompt = prompt.toString();
        log.debug("[CategoryPromptBuilder] Final prompt for '{}': {}", categoryName, finalPrompt);
        return finalPrompt;
    }

    /**
     * Convenience overload without creativeDirection.
     */
    public String buildCategoryFoodImagePrompt(String categoryName, String description) {
        return buildCategoryFoodImagePrompt(categoryName, description, null);
    }

    /**
     * Convenience overload with name only.
     */
    public String buildCategoryFoodImagePrompt(String categoryName) {
        return buildCategoryFoodImagePrompt(categoryName, null, null);
    }

    private void validateInputs(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) {
            throw new InvalidPromptException("Category name must not be blank");
        }
        if (categoryName.length() > 200) {
            throw new InvalidPromptException("Category name is too long (max 200 characters)");
        }
        String combined = categoryName.toLowerCase();
        for (String blocked : BLOCKED_TERMS) {
            if (combined.contains(blocked)) {
                throw new InvalidPromptException("Category name contains disallowed content: " + blocked);
            }
        }
    }
}
