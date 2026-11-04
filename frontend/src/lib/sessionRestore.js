/**
 * A temporary connection failure must not erase a remembered login.
 * Only an explicit invalid-session response should end the saved session.
 * Other API requests remain server-authorized as usual.
 */
export function shouldClearSessionAfterRestoreFailure(error) {
  return error?.response?.status === 401;
}
