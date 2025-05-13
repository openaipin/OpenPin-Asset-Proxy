import { corsHeaders, GITHUB_BASE, isPathAllowed } from "./config";

export default {
  async fetch(
    request: Request,
    env: { GITHUB_TOKEN: string }, // token from Worker secret
    ctx: ExecutionContext // lets us write to cache without blocking
  ): Promise<Response> {
    const { method } = request;

    // Verify method allowed
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (method !== "GET") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders() });
    }

    // Verify path whitelisted
    const url = new URL(request.url);
    const ghPath = url.pathname;
    if (!isPathAllowed(ghPath)) {
      return new Response("Forbidden: path not whitelisted", { status: 403, headers: corsHeaders() });
    }

    // Check edge cache first ― GitHub assets are immutable
    const upstreamURL = GITHUB_BASE + ghPath;
    const cacheKey = new Request(upstreamURL, request);
    const cached = await caches.default.match(cacheKey);
    if (cached) return cached;

    // Fetch upstream resource (authenticated)
    let upstreamResp: Response;
    console.log(env.GITHUB_TOKEN);
    try {
      upstreamResp = await fetch(upstreamURL, {
        headers: {
          "User-Agent": "ghproxy-worker",
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        },
      });
    } catch (err) {
      return new Response(`Upstream fetch failed: ${err}`, { status: 502, headers: corsHeaders() });
    }

    // Set CORS headers
    const headers = new Headers(upstreamResp.headers);
    Object.entries(corsHeaders()).forEach(([k, v]) => headers.set(k, v));

    // Encourage browser/CDN caching since GitHub release assets are immutable
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    const proxiedResp = new Response(upstreamResp.body, {
      status: upstreamResp.status,
      headers,
    });

    // Save successful responses to cache (non-blocking)
    if (upstreamResp.ok) {
      ctx.waitUntil(caches.default.put(cacheKey, proxiedResp.clone()));
    }

    return proxiedResp;
  },
};
