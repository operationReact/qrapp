import axios from "axios";

// Resolve API base URL:
// 1) Prefer VITE_API_URL injected at build/dev time
// 2) If not present, when running in a browser on localhost use http://localhost:8080
// 3) Otherwise fall back to production URL
const resolvedBase = (() => {
    const vite = import.meta?.env?.VITE_API_URL;
    if (vite) return vite;
    try {
        const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
        if (host.includes('localhost') || host === '127.0.0.1') {
            return 'http://localhost:8080';
        }
    } catch (e) {
        // ignore
    }
    return 'https://api.broandbro.in';
})();

const API = axios.create({ baseURL: resolvedBase });

// Helpful debug during development to confirm which backend URL is used
if (typeof window !== 'undefined' && window.location && window.location.hostname.includes('localhost')) {
    // eslint-disable-next-line no-console
    console.debug('[api] using backend base URL:', resolvedBase);
}

// --- simple in-memory cache for GET requests (used for wallet balance)
const cache = new Map(); // key -> { ts, data }
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

function getCache(key) {
    const e = cache.get(key);
    if (!e) return null;
    if (Date.now() - e.ts > CACHE_TTL_MS) {
        cache.delete(key);
        return null;
    }
    return e.data;
}
function setCache(key, data) {
    cache.set(key, { ts: Date.now(), data });
}

// --- dedupe pending requests to avoid firing the same request multiple times
const pending = new Map(); // key -> promise
function dedupeRequest(key, fn) {
    if (pending.has(key)) return pending.get(key);
    const p = fn().finally(() => pending.delete(key));
    pending.set(key, p);
    return p;
}

// Attach token from localStorage for each request if present
API.interceptors.request.use((config) => {
    try {
        const raw = localStorage.getItem('userCreds');
        const creds = raw ? JSON.parse(raw) : null;
        if (creds && creds.token) {
            config.headers = config.headers || {};
            config.headers['Authorization'] = `Bearer ${creds.token}`;
        }
    } catch (e) {
        // ignore malformed localStorage
        // do not spam console, but keep a single log for debugging
        // console.error('Failed to read userCreds from localStorage', e);
    }
    return config;
}, (error) => Promise.reject(error));

// Global response handler: on 401 clear user creds and emit auth:logout event
API.interceptors.response.use(
    (resp) => resp,
    (error) => {
        const status = error?.response?.status;
        if (status === 401) {
            try {
                delete API.defaults.headers.common['Authorization'];
                localStorage.removeItem('userCreds');
                // notify app that logout occurred so contexts can react
                window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'unauthorized' } }));
            } catch (e) { /* ignore */ }
        }
        return Promise.reject(error);
    }
);

export const setAdminAuth = (username, password) => {
    if (username && password) {
        API.defaults.auth = { username, password };
    } else {
        delete API.defaults.auth;
    }
};

// Set bearer token for regular user auth. If token is null, remove header.
export const setUserAuth = (token) => {
    if (token) {
        API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        // also persist in localStorage so new tabs pick it up
        try { localStorage.setItem('userCreds', JSON.stringify({ token })); } catch(e){ console.debug('setUserAuth localStorage write failed', e); }
    } else {
        try { localStorage.removeItem('userCreds'); } catch(e){ console.debug('setUserAuth localStorage remove failed', e); }
        delete API.defaults.headers.common['Authorization'];
    }
};

export const loginUser = (credentials) => API.post('/auth/login', credentials);
export const getCurrentUser = () => API.get('/auth/me');

// getMenu: optionally accepts { isVeg: true|false }
export const getMenu = (opts = {}) => {
    const params = {};
    if (typeof opts.isVeg === 'boolean') params.isVeg = opts.isVeg;
    if (opts.category) params.category = opts.category;
    if (typeof opts.recommended === 'boolean') params.recommended = opts.recommended;
    if (typeof opts.available === 'boolean') params.available = opts.available;
    return API.get("/menu", { params });
};
export const getRecommendedMenu = ({ limit = 6 } = {}) => {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, Number(limit))) : 6;
    return API.get('/menu/recommended', { params: { limit: safeLimit } });
};
export const createOrder = (data) => API.post("/orders", data);
// Wallet APIs
// walletGetBalance: use cache + dedupe to avoid repeated identical GETs
export const walletGetBalance = () => {
    const key = 'GET:/api/wallet/balance';
    const cached = getCache(key);
    if (cached) {
        return Promise.resolve({ data: cached });
    }
    return dedupeRequest(key, async () => {
        const resp = await API.get('/api/wallet/balance');
        // cache only if successful
        setCache(key, resp.data);
        // no events: balance consumers should refresh or re-request when needed
        return resp;
    });
};

// synchronous helper to read cached wallet balance if available (returns raw data or null)
export const getCachedWalletBalance = () => {
    return getCache('GET:/api/wallet/balance');
};

// walletGetTransactions: dedupe + short cache to avoid repeated transaction DB reads
export const walletGetTransactions = ({ page = 0, size = 20 } = {}) => {
    const safePage = Number.isFinite(page) ? Math.max(0, Number(page)) : 0;
    const safeSize = Number.isFinite(size) ? Math.max(1, Math.min(50, Number(size))) : 20;
    const key = `GET:/api/wallet/transactions?page=${safePage}&size=${safeSize}`;
    const cached = getCache(key);
    if (cached) return Promise.resolve({ data: cached });
    return dedupeRequest(key, async () => {
        const resp = await API.get('/api/wallet/transactions', { params: { page: safePage, size: safeSize } });
        // cache briefly
        setCache(key, resp.data);
        return resp;
    });
};
export const walletCreateOrder = (data) => API.post('/api/wallet/create-order', data);
export const walletVerifyPayment = (data) => API.post('/api/wallet/verify-payment', data);
export const walletPay = (data) => API.post('/api/wallet/pay', data);
export const createMenuItem = (data) => {
    // If caller passed FormData, send multipart/form-data
    if (data instanceof FormData) {
        // Let browser set Content-Type with boundary
        return API.post('/menu', data);
    }
    return API.post("/menu", data);
};
export const getOrdersAdmin = ({ page = 0, size = 10, status } = {}) => {
    const params = { page, size };
    if (status) params.status = status;
    return API.get('/admin/orders', { params });
};
export const updateOrderStatusAdmin = (id, data) => API.patch(`/admin/orders/${id}/status`, data);
export const updateMenuItem = (id, data) => {
    if (data instanceof FormData) {
        // Let browser set the multipart Content-Type with boundary
        return API.put(`/menu/${id}`, data);
    }
    return API.put(`/menu/${id}`, data);
};
export const deleteMenuItem = (id) => API.delete(`/menu/${id}`);

export default API;

