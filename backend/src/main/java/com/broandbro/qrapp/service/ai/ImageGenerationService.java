package com.broandbro.qrapp.service.ai;

/**
 * Abstraction over AI image generation providers.
 * Currently backed by OpenAI Images API; easily swappable for
 * Stability AI, Midjourney, Google Imagen, etc.
 */
public interface ImageGenerationService {

    /**
     * Generates a professional food image for the given menu item context.
     *
     * @param menuItemName     Name of the menu item
     * @param categoryName     Category / cuisine context
     * @param isVeg            Whether the item is vegetarian
     * @param description      Optional description for additional visual keywords
     * @param additionalPrompt Optional free-text admin hint appended to the prompt
     * @return Raw PNG image bytes
     */
    byte[] generateFoodImage(String menuItemName, String categoryName, Boolean isVeg,
                             String description, String additionalPrompt);

    /** Convenience overload without additionalPrompt. */
    default byte[] generateFoodImage(String menuItemName, String categoryName, Boolean isVeg, String description) {
        return generateFoodImage(menuItemName, categoryName, isVeg, description, null);
    }

    /** Convenience overload without description or additionalPrompt. */
    default byte[] generateFoodImage(String menuItemName, String categoryName, Boolean isVeg) {
        return generateFoodImage(menuItemName, categoryName, isVeg, null, null);
    }

    /**
     * Returns the name of the underlying provider (e.g. "openai", "stability").
     */
    String getProviderName();
}

