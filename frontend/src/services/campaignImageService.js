import axios from 'axios';

/**
 * Service for AI-generated campaign hero billboard images.
 * Provides synchronous preview generation and application.
 */

const API_BASE = '/api/admin/home-campaigns';

/**
 * Generate a preview image for a campaign.
 * Returns a single image URL for admin preview (not persisted until apply).
 *
 * @param {number} campaignId - Campaign ID
 * @param {number} locationId - Location ID (for authorization)
 * @param {string} creativeDirection - Optional creative direction hint
 * @returns {Promise<{imageUrls: string[], imagePrompt: string}>}
 */
export async function generateCampaignImagePreview(campaignId, locationId, creativeDirection = null) {
  const url = `${API_BASE}/${campaignId}/generate-image`;
  const params = new URLSearchParams({ locationId });

  const body = creativeDirection ? { creativeDirection } : {};

  const response = await axios.post(url, body, {
    params: Object.fromEntries(params),
    timeout: 60000, // Allow up to 60 seconds for AI image generation
  });

  return {
    imageUrls: [response.data.imageUrl],
    imagePrompt: response.data.prompt,
  };
}

/**
 * Apply a generated image to a campaign.
 * Persists the image URL to the campaign, marks it as AI-generated,
 * and triggers cache invalidation on the server.
 *
 * @param {number} campaignId - Campaign ID
 * @param {number} locationId - Location ID (for authorization)
 * @param {string} imageUrl - The image URL to apply (must be the one returned by preview)
 * @param {string} previousGeneratedUrl - Optional URL of a previous preview to clean up
 * @returns {Promise<{id, name, imageUrl, aiGeneratedImage}>}
 */
export async function applyCampaignImage(campaignId, locationId, imageUrl, previousGeneratedUrl = null) {
  const url = `${API_BASE}/${campaignId}/apply-generated-image`;
  const params = new URLSearchParams({ locationId });

  const body = {
    imageUrl,
  };
  if (previousGeneratedUrl) {
    body.previousGeneratedUrl = previousGeneratedUrl;
  }

  const response = await axios.post(url, body, {
    params: Object.fromEntries(params),
  });

  return response.data;
}

/**
 * Generate and immediately apply an image in one flow.
 * Convenience method that calls both generate and apply.
 *
 * @param {number} campaignId - Campaign ID
 * @param {number} locationId - Location ID
 * @param {string} creativeDirection - Optional creative direction
 * @param {string} previousGeneratedUrl - Optional previous URL to clean up
 * @returns {Promise<{id, name, imageUrl, aiGeneratedImage}>}
 */
export async function generateAndApplyCampaignImage(
  campaignId,
  locationId,
  creativeDirection = null,
  previousGeneratedUrl = null,
) {
  const preview = await generateCampaignImagePreview(campaignId, locationId, creativeDirection);
  const imageUrl = preview.imageUrls[0];
  return applyCampaignImage(campaignId, locationId, imageUrl, previousGeneratedUrl);
}
