// Local-only, fixed upstream. Do not reuse as a production reverse proxy.
export const PROD_API = "https://api.broandbro.in";
export const PROXY_PREFIX = "/__prod_api";
export function productionProxy({ allowWrites = false } = {}) {
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  return {
    name: "brobro-local-production-proxy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url, "http://localhost").pathname;
        if (pathname !== PROXY_PREFIX && !pathname.startsWith(PROXY_PREFIX + "/")) return next();
        const localOrigin = "http://" + req.headers.host;
        const origin = req.headers.origin;
        if (origin && origin !== localOrigin) {
          res.writeHead(403, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Cross-origin proxy request refused" }));
        }
        if (!allowWrites && !safeMethods.has(req.method)) {
          res.writeHead(403, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Production writes disabled. Use the explicitly named PROD Writes configuration only when intended." }));
        }
        next();
      });
    },
    config() {
      return {
        server: {
          host: "localhost",
          port: 5173,
          strictPort: true,
          proxy: {
            ["^" + PROXY_PREFIX + "(?:/|$)"]: {
              target: PROD_API,
              changeOrigin: true,
              secure: true,
              rewrite: url => url.slice(PROXY_PREFIX.length) || "/",
              configure(proxy) {
                proxy.on("proxyReq", (upstream) => {
                  // Browser is same-origin with the local proxy; do not send the local Origin upstream.
                  upstream.removeHeader("origin");
                });
              }
            }
          }
        }
      };
    }
  };
}
