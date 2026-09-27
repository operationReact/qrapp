/**
 * Parses API errors and extracts structured error information.
 * Handles both structured error responses and legacy error formats.
 */
export function parseApiError(error) {
  // Extract error response
  const response = error?.response;
  const data = response?.data;
  const status = response?.status;

  // Structured error format: { code, message }
  if (data && typeof data === 'object' && data.code && data.message) {
    return {
      code: data.code,
      message: data.message,
      status,
      isBusinessError: true,
    };
  }

  // String message (legacy format)
  if (typeof data === 'string' && data) {
    // Try to extract code from message (e.g., "PAYMENT_REQUIRED_FOR_HANDOVER: ...")
    const codeMatch = data.match(/^([A-Z_]+):/);
    const code = codeMatch ? codeMatch[1] : null;
    const message = codeMatch ? data.substring(codeMatch[0].length + 1).trim() : data;
    
    return {
      code,
      message,
      status,
      isBusinessError: code !== null,
    };
  }

  // Network error
  if (!response) {
    return {
      code: 'NETWORK_ERROR',
      message: error?.message || 'Unable to connect. Please try again.',
      status: null,
      isBusinessError: false,
    };
  }

  // Unknown error
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred. Please try again.',
    status,
    isBusinessError: false,
  };
}

/**
 * Gets a user-friendly message for a business error code.
 * Use this to provide consistent messaging across the app.
 */
export function getBusinessErrorMessage(code, customMessage = null) {
  const messages = {
    PAYMENT_REQUIRED_FOR_HANDOVER: 'Payment is required before hand over.',
    ORDER_NOT_FOUND: 'Order is no longer available.',
    UNAUTHORIZED: 'You are not authorized to update this order.',
    INVALID_STATUS_TRANSITION: 'Order status has changed. Please refresh and try again.',
  };

  return customMessage || messages[code] || 'Unable to update the order. Please try again.';
}
