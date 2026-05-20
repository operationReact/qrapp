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
     * @param menuItemName  Name of the menu item (used in the prompt)
     * @param categoryName  Category / cuisine context
     * @param isVeg         Whether the item is vegetarian (used for prompt tuning)
     * @return Raw PNG image bytes
     */
    byte[] generateFoodImage(String menuItemName, String categoryName, Boolean isVeg);

    /**
     * Returns the name of the underlying provider (e.g. "openai", "stability").
     */
    String getProviderName();
}

