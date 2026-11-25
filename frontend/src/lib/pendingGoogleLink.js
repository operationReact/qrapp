// Ephemeral, same-tab navigation only. Never persist Google credentials or tickets.
let pending = null;
export const rememberGoogleLink = (value) => { pending = value; };
export const getPendingGoogleLink = () => pending;
export const clearPendingGoogleLink = () => { pending = null; };
