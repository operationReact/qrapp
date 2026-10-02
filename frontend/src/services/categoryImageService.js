import axios from 'axios';

/**
 * Service for AI-generated category food-photography images.
 * Provides synchronous preview generation and application.
 */

const API_BASE = '/api/categories';

/**
 * Generate a preview image for a category.
 * Returns a single image URL for admin preview (not persisted until apply).
 *
 * @param {number} categoryId - Category ID
 * @param {number} locationId - Location ID (for authorization)
 * @param {string} additionalPrompt - Optional creative direction/additional prompt
 * @returns {Promise<{imageUrls: string[], imagePrompt: string}>}
 */
export async function generateCategoryImagePreview(categoryId, locationId, additionalPrompt = null) {
  const url = `${API_BASE}/${categoryId}/generate-image`;
  const params = new URLSearchParams({ locationId });

  const body = additionalPrompt ? { additionalPrompt } : {};

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
 * Apply a generated image to a category.
 * Persists the image URL to the category, marks it as AI-generated,
 * and triggers cache invalidation on the server.
 *
 * @param {number} categoryId - Category ID
 * @param {number} locationId - Location ID (for authorization)
 * @param {string} imageUrl - The image URL to apply (must be the one returned by preview)
 * @param {string} previousGeneratedUrl - Optional URL of a previous preview to clean up
 * @returns {Promise<{id, name, imageUrl, aiGeneratedImage}>}
 */
export async function applyCategoryImage(categoryId, locationId, imageUrl, previousGeneratedUrl = null) {
  const url = `${API_BASE}/${categoryId}/apply-generated-image`;
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
 * @param {number} categoryId - Category ID
 * @param {number} locationId - Location ID
 * @param {string} additionalPrompt - Optional additional prompt
 * @param {string} previousGeneratedUrl - Optional previous URL to clean up
 * @returns {Promise<{id, name, imageUrl, aiGeneratedImage}>}
 */
export async function generateAndApplyCategoryImage(
  categoryId,
  locationId,
  additionalPrompt = null,
  previousGeneratedUrl = null,
) {
  const preview = await generateCategoryImagePreview(categoryId, locationId, additionalPrompt);
  const imageUrl = preview.imageUrls[0];
  return applyCategoryImage(categoryId, locationId, imageUrl, previousGeneratedUrl);
}
