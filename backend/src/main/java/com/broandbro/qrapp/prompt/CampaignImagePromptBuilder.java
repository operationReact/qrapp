package com.broandbro.qrapp.prompt;

import com.broandbro.qrapp.exception.InvalidPromptException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Builds AI image generation prompts for Home campaign hero billboards.
 *
 * <p>Design principles:
 * <ol>
 *   <li><b>Hero-safe composition</b> – no critical visuals near crop edges</li>
 *   <li><b>Artwork only</b> – NO text, buttons, UI, or app chrome</li>
 *   <li><b>Landscape format</b> – optimized for mobile hero billboard</li>
 *   <li><b>Food-first</b> – premium food photography as the visual anchor</li>
 *   <li><b>Premium lighting</b> – cinematic, rich, appetizing</li>
 * </ol>
 *
 * <p>The frontend will render all text (title, badge, CTA) as separate layers.
 * This prompt generates ONLY the visual background artwork.
 */
@Component
@Slf4j
public class CampaignImagePromptBuilder {

    private static final Set<String> BLOCKED_TERMS = Set.of(
            "nude", "naked", "violence", "gore", "blood", "weapon", "drug",
            "button", "text", "typography", "logo", "watermark", "ui ", "interface"
    );

    /**
     * Builds a hero-safe campaign image prompt.
     *
     * @param campaignTitle The campaign title (e.g. "Biryani Fest")
     * @param badge Optional badge text (e.g. "SPECIAL OFFER", "50% OFF")
     * @param categoryName Optional category context (e.g. "Biryani", "Burgers")
     * @param creativeDirection Optional admin creative hint
     * @return AI-ready prompt text
     */
    public String buildCampaignHeroPrompt(String campaignTitle, String badge,
                                         String categoryName, String creativeDirection) {
        validateInputs(campaignTitle);

        // Build prompt components
        StringBuilder prompt = new StringBuilder();

        // Main instruction
        prompt.append("Create a premium food-delivery campaign hero image for: ");
        prompt.append(campaignTitle.trim()).append(". ");

        // Context
        if (badge != null && !badge.isBlank()) {
            prompt.append("Campaign badge/offer: ").append(badge.trim()).append(". ");
        }
        if (categoryName != null && !categoryName.isBlank()) {
            prompt.append("Food focus: ").append(categoryName.trim()).append(". ");
        }

        // Core visual requirements
        prompt.append("Visual composition: ");
        prompt.append("Premium food-photography artwork. ");
        prompt.append("Landscape hero format (16:9 or wider). ");
        prompt.append("Appetizing realistic food as the primary focal point. ");
        prompt.append("Cinematic premium lighting, warm and inviting. ");
        prompt.append("Rich, natural colour palette with depth. ");
        prompt.append("Shallow depth of field with soft bokeh background. ");
        prompt.append("Ultra-realistic food textures and details. ");

        // Admin creative direction (optional refinement)
        if (creativeDirection != null && !creativeDirection.isBlank()) {
            prompt.append("Creative direction: ").append(creativeDirection.trim()).append(". ");
        }

        // Composition safety (CRITICAL for hero overlay)
        prompt.append("Composition safety: ");
        prompt.append("Avoid placing critical food details directly center-top (space for badge/title overlay). ");
        prompt.append("Place main visual focal point toward lower-right or left side. ");
        prompt.append("Ensure balanced composition that works when text layers are overlaid. ");
        prompt.append("No harsh edges or important details at crop boundaries. ");

        // STRICT exclusions
        prompt.append("MUST NOT include: ");
        prompt.append("any text, typography, fonts, numbers, words, labels. ");
        prompt.append("any buttons, links, navigation, UI elements, app chrome. ");
        prompt.append("any logos, watermarks, branding text. ");
        prompt.append("any people's faces (abstract food only). ");
        prompt.append("any menus, prices, or promotional text inside the image. ");

        // Final quality directive
        prompt.append("Deliver: ");
        prompt.append("4K ultra-high resolution. ");
        prompt.append("Commercial food-photography quality. ");
        prompt.append("Professional shot with 85mm lens on a full-frame camera. ");
        prompt.append("suitable for a premium food-delivery mobile app hero billboard.");

        String finalPrompt = prompt.toString();
        log.debug("[CampaignPromptBuilder] Final prompt for '{}': {}", campaignTitle, finalPrompt);
        return finalPrompt;
    }

    /**
     * Convenience overload without creativeDirection.
     */
    public String buildCampaignHeroPrompt(String campaignTitle, String badge, String categoryName) {
        return buildCampaignHeroPrompt(campaignTitle, badge, categoryName, null);
    }

    /**
     * Convenience overload with title only.
     */
    public String buildCampaignHeroPrompt(String campaignTitle) {
        return buildCampaignHeroPrompt(campaignTitle, null, null, null);
    }

    private void validateInputs(String campaignTitle) {
        if (campaignTitle == null || campaignTitle.isBlank()) {
            throw new InvalidPromptException("Campaign title must not be blank");
        }
        if (campaignTitle.length() > 200) {
            throw new InvalidPromptException("Campaign title is too long (max 200 characters)");
        }
        String combined = campaignTitle.toLowerCase();
        for (String blocked : BLOCKED_TERMS) {
            if (combined.contains(blocked)) {
                throw new InvalidPromptException("Campaign title contains disallowed content: " + blocked);
            }
        }
    }
}
