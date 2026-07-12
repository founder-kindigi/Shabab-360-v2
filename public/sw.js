// ──────────────────────────────────────────────────────────────────
// Shabab360 Service Worker
// Version: 1.0.0 — bump this constant to invalidate all caches
// ──────────────────────────────────────────────────────────────────

const CACHE_VERSION = "shabab360-v1.0.0";

// Cache names keyed by purpose
const CACHES = {
  appShell: `${CACHE_VERSION}-app-shell`,     // HTML + critical app code
  static:   `${CACHE_VERSION}-static`,        // _next/static/* assets
  fonts:    `${CACHE_VERSION}-fonts`,         // Google Fonts / font files
  images:   `${CACHE_VERSION}-images`,        // Cached images / icons
};

// ── Message handler: allow manual skipWaiting from the client ────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Install: pre-cache the app shell ──────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHES.appShell).then((cache) => {
      // Pre-cache the root HTML page — the shell loads everything else
      return cache.add("/").then(() => {
        // Don't auto-skip-waiting here; let the client decide via message
      });
    })
  );
});

// ── Activate: clean up old caches ─────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((allCacheNames) => {
      return Promise.all(
        allCacheNames
          .filter((name) => !Object.values(CACHES).includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Take control of all open clients immediately
      return self.clients.claim();
    })
  );
});

// ── Fetch: route requests to the right caching strategy ──────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PATCH, DELETE, etc.)
  if (request.method !== "GET") return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) return;

  // ── Strategy 1: Cache-first for static assets ───────────────────
  // These files are content-hashed by Next.js, so they never change
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, CACHES.static));
    return;
  }

  // ── Strategy 2: Cache-first for fonts ───────────────────────────
  if (isFontRequest(url, request)) {
    event.respondWith(cacheFirst(request, CACHES.fonts));
    return;
  }

  // ── Strategy 3: Cache-first for icons/images from our origin ────
  if (isLocalImage(url)) {
    event.respondWith(cacheFirst(request, CACHES.images));
    return;
  }

  // ── Strategy 4: Network-first for API calls ─────────────────────
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, CACHES.appShell));
    return;
  }

  // ── Strategy 5: Network-first for navigation (HTML pages) ───────
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request, CACHES.appShell));
    return;
  }

  // ── Default: network with cache fallback ────────────────────────
  event.respondWith(networkFirst(request, CACHES.appShell));
});

// ──────────────────────────────────────────────────────────────────
// Caching strategies
// ──────────────────────────────────────────────────────────────────

/**
 * Cache-first strategy: try cache, fall back to network.
 * Ideal for immutable, content-hashed assets.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // If both cache and network fail, return a basic offline response
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

/**
 * Network-first strategy: try network, fall back to cache.
 * Ideal for API calls and navigation where fresh data matters.
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // For navigation requests, serve the cached shell
    if (isNavigationRequest(request)) {
      const shell = await caches.match("/");
      if (shell) return shell;
    }

    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

// ──────────────────────────────────────────────────────────────────
// Request classification helpers
// ──────────────────────────────────────────────────────────────────

/** Matches _next/static/* (JS, CSS bundles with content hashes) */
function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

/** Matches font file requests (Google Fonts, local fonts) */
function isFontRequest(url, request) {
  return (
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.pathname.startsWith("/_next/static/media/") ||
    (request.destination === "font")
  );
}

/** Matches local icons and images */
function isLocalImage(url) {
  return (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/logo.svg") ||
    url.pathname === "/favicon.ico"
  );
}

/** Matches /api/* endpoints */
function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

/** Matches HTML navigation requests (accept: text/html) */
function isNavigationRequest(request) {
  return request.mode === "navigate" || request.destination === "document";
}