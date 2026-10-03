package com.broandbro.qrapp.prompt;

import com.broandbro.qrapp.exception.InvalidPromptException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Dedicated CATEGORY image profile: bright, high-key, colourful food photography that stays
 * readable as a 56-72px circular/square tile. Intentionally independent from
 * {@link FoodImagePromptBuilder} (menu items) and {@link CampaignImagePromptBuilder}, whose
 * darker, cinematic art direction must not leak into category tiles.
 */
@Component
@Slf4j
public class CategoryImagePromptBuilder {

    /** Square output; categories are rendered as small circular/square thumbnails. */
    public static final String CATEGORY_IMAGE_SIZE = "1024x1024";

    private static final Set<String> BLOCKED_TERMS = Set.of(
            "nude", "naked", "violence", "gore", "blood", "weapon", "drug",
            "typography", "logo", "watermark", "interface", "button", "label", "price", "rupees"
    );
    private static final Pattern BLOCKED = Pattern.compile(
            "\\b(" + String.join("|", BLOCKED_TERMS) + ")\\b", Pattern.CASE_INSENSITIVE);

    /** Keyword (matched against the lower-cased category name) -> visual cues. Order matters. */
    private static final Map<String, String> CUES = new LinkedHashMap<>();

    static {
        CUES.put("biryani", "a heaped plate of fragrant biryani with vibrant saffron-orange and white rice grains, visible fresh green coriander and mint, golden fried onions and a boiled-egg or meat piece, rich natural colours");
        CUES.put("coffee", "a clearly recognisable ceramic cup of warm brown coffee with creamy foam and latte art on a bright neutral background, a few coffee beans beside it");
        CUES.put("hot milk", "a glass or cup of warm creamy milk with subtle gentle steam, bright warm cream-and-honey toned background");
        CUES.put("milk", "a glass of fresh creamy milk with a soft glow, bright warm cream-toned background");
        CUES.put("tea", "a clear glass cup of fresh herbal tea in fresh green and golden tones with lemon slice and mint leaves, bright clean presentation");
        CUES.put("health", "fresh green and herbal tones with lemon, mint and herbs, bright clean wellness presentation");
        CUES.put("juice", "a tall glass of vividly coloured fresh juice with ice and a fruit slice, juicy fruits beside it");
        CUES.put("shake", "a thick colourful milkshake in a tall glass with whipped cream and toppings");
        CUES.put("smoothie", "a thick vividly coloured smoothie in a tall glass with fresh fruit pieces");
        CUES.put("burger", "a juicy stacked burger with a glossy sesame bun, fresh green lettuce, red tomato and melted yellow cheese");
        CUES.put("pizza", "a whole pizza with bubbling melted cheese, red tomato sauce, green basil and colourful toppings");
        CUES.put("pasta", "a bowl of pasta in a vivid red or creamy sauce with fresh basil and parmesan");
        CUES.put("noodle", "a bowl of glossy stir-fried noodles with colourful vegetables and spring onion");
        CUES.put("chinese", "a bowl of glossy stir-fried noodles with colourful vegetables and spring onion");
        CUES.put("dosa", "a golden crispy dosa with small bowls of white coconut chutney, red chutney and orange sambar");
        CUES.put("south indian", "a golden crispy dosa with small bowls of white coconut chutney, red chutney and orange sambar");
        CUES.put("idli", "soft white idlis with bright orange sambar and white coconut chutney");
        CUES.put("sandwich", "a toasted sandwich cut in half showing colourful fillings of green, red and yellow");
        CUES.put("roll", "a golden wrap cut in half showing colourful fillings");
        CUES.put("wrap", "a golden wrap cut in half showing colourful fillings");
        CUES.put("dessert", "a colourful indulgent dessert with chocolate, cream and fresh berries");
        CUES.put("sweet", "colourful Indian sweets in warm golden and saffron tones");
        CUES.put("ice cream", "colourful scoops of ice cream in a cone with sprinkles");
        CUES.put("cake", "a slice of cake with glossy frosting and fresh berries");
        CUES.put("snack", "a crunchy golden assorted snack with a bright green chutney dip");
        CUES.put("starter", "golden crispy starters with a bright chutney dip and lemon wedge");
        CUES.put("breakfast", "a bright appetising breakfast plate with golden toast, egg and fresh fruit");
        CUES.put("curry", "a bowl of rich orange-red curry with a cream swirl and fresh green coriander");
        CUES.put("north indian", "a bowl of rich orange-red curry with a cream swirl and fresh green coriander, with golden naan");
        CUES.put("rice", "a bowl of fluffy rice with colourful vegetables and fresh herbs");
        CUES.put("salad", "a vibrant bowl of fresh salad with green, red and orange vegetables");
        CUES.put("soup", "a bowl of steaming soup in warm vivid colour with fresh herbs");
        CUES.put("fries", "a pile of golden crispy fries with a red ketchup dip");
    }

    /**
     * @param categoryName      category name, e.g. "Biryani", "Hot Milk"
     * @param description       optional category description for visual hints
     * @param creativeDirection optional admin hint; cannot re-introduce dark styling
     */
    public String buildCategoryFoodImagePrompt(String categoryName, String description, String creativeDirection) {
        validateInputs(categoryName);
        String name = categoryName.trim();

        StringBuilder p = new StringBuilder();
        p.append("Bright premium commercial food photography for a food delivery app category tile. ");
        p.append("Show \"").append(name).append("\" as the clear visual subject");
        String cue = resolveCue(name);
        if (cue != null) {
            p.append(": ").append(cue);
        }
        p.append(". ");

        if (description != null && !description.isBlank()) {
            p.append("Context: ").append(description.trim()).append(". ");
        }

        p.append("Use vibrant, appetizing, natural food colours with fresh ingredients and realistic textures; ");
        p.append("medium-high colour saturation. ");
        p.append("Bright high-key lighting, soft diffused daylight, soft gentle shadows, and a clean light background ");
        p.append("(white, cream or a soft pastel). ");
        p.append("Strong separation between the food and the background while the whole image stays bright and colourful. ");
        p.append("Simple composition that is instantly recognisable at 56-72px: a single hero dish, centred, ");
        p.append("filling about 65-80% of the square frame, fully inside the frame with no cropping of the main subject, ");
        p.append("shot from a slightly elevated three-quarter angle, minimal props. ");
        p.append("Clean premium food-commerce aesthetic for a modern Indian food delivery application. ");

        if (creativeDirection != null && !creativeDirection.isBlank()) {
            p.append("Additional direction (keep the bright high-key style): ")
                    .append(creativeDirection.trim()).append(". ");
        }

        p.append("Avoid: dark or black backgrounds, moody or cinematic lighting, dramatic low-key photography, ");
        p.append("heavy or deep shadows, dark wooden or slate surfaces, brown or grey colour grading, ");
        p.append("dull or desaturated food, excessive contrast, dim ambience, shallow-depth-of-field bokeh blur, ");
        p.append("cluttered scenes, multiple competing dishes, excessive props, tiny food, ");
        p.append("text, numbers, logos, watermarks, typography, UI elements, badges, people, hands. ");
        p.append("The final image should feel fresh, colourful, premium, appetizing and energetic.");

        String prompt = p.toString();
        log.debug("[CategoryPromptBuilder] Prompt for '{}': {}", name, prompt);
        return prompt;
    }

    public String buildCategoryFoodImagePrompt(String categoryName, String description) {
        return buildCategoryFoodImagePrompt(categoryName, description, null);
    }

    public String buildCategoryFoodImagePrompt(String categoryName) {
        return buildCategoryFoodImagePrompt(categoryName, null, null);
    }

    private String resolveCue(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        for (Map.Entry<String, String> entry : CUES.entrySet()) {
            if (lower.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private void validateInputs(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) {
            throw new InvalidPromptException("Category name must not be blank");
        }
        if (categoryName.length() > 200) {
            throw new InvalidPromptException("Category name is too long (max 200 characters)");
        }
        var matcher = BLOCKED.matcher(categoryName);
        if (matcher.find()) {
            throw new InvalidPromptException("Category name contains disallowed content: " + matcher.group());
        }
    }
}
