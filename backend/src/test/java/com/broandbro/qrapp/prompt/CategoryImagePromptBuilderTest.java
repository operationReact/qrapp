package com.broandbro.qrapp.prompt;

import com.broandbro.qrapp.exception.InvalidPromptException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CategoryImagePromptBuilderTest {

    private final CategoryImagePromptBuilder builder = new CategoryImagePromptBuilder();

    @Test
    void promptIsBrightHighKeyAndDoesNotRequestDarkStyling() {
        String prompt = builder.buildCategoryFoodImagePrompt("Biryani", null, null).toLowerCase();
        assertTrue(prompt.contains("high-key"));
        assertTrue(prompt.contains("saffron"));
        String positive = prompt.substring(0, prompt.indexOf("avoid:"));
        for (String banned : new String[]{"cinematic", "moody", "dramatic", "dark slate", "bokeh", "85mm"}) {
            assertFalse(positive.contains(banned), banned);
        }
    }

    @Test
    void categorySpecificCuesAreApplied() {
        assertTrue(builder.buildCategoryFoodImagePrompt("Hot Milk").contains("creamy milk"));
        assertTrue(builder.buildCategoryFoodImagePrompt("Health Teas").contains("mint"));
        assertTrue(builder.buildCategoryFoodImagePrompt("Coffee").contains("foam"));
    }

    @Test
    void namesContainingBlockedSubstringsAreNotRejected() {
        builder.buildCategoryFoodImagePrompt("Burgers");
        builder.buildCategoryFoodImagePrompt("Starters");
        assertThrows(InvalidPromptException.class, () -> builder.buildCategoryFoodImagePrompt("Logo specials"));
    }

    @Test
    void creativeDirectionCannotDropTheBrightStyle() {
        String prompt = builder.buildCategoryFoodImagePrompt("Pizza", null, "extra cheese");
        assertTrue(prompt.contains("extra cheese"));
        assertTrue(prompt.contains("keep the bright high-key style"));
    }
}