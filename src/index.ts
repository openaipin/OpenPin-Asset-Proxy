import { corsHeaders, GITHUB_BASE, isPathAllowed } from "./config";

export default {
  async fetch(
    request: Request,
    env: { GITHUB_TOKEN: string }, // token from Worker secret
    ctx: ExecutionContext
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

    // Build upstream URL
    const upstreamURL = GITHUB_BASE + ghPath;

    // Check cache
    const cached = await caches.default.match(upstreamURL);
    if (cached) {
      const hdrs = new Headers(cached.headers);
      hdrs.set("X-Worker-Cache", "HIT");

      return new Response(cached.body, {
        status: cached.status,
        headers: hdrs,
      });
    }

    // Fetch upstream resource (authenticated)
    let upstreamResp: Response;
    try {
      upstreamResp = await fetch(upstreamURL, {
        headers: {
          "User-Agent": "ghproxy-worker",
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        },
      });

      if (!upstreamResp.ok) throw new Error("Request failed with code: " + upstreamResp.status);
    } catch (err) {
      console.error(err);
      return new Response(`Upstream fetch failed`, { status: 502, headers: corsHeaders() });
    }

    // Set headers
    const respHeaders = new Headers(corsHeaders());
    const contentLength = upstreamResp.headers.get("Content-Length");
    if (contentLength) {
      respHeaders.set("Content-Length", contentLength);
    }
    respHeaders.set("Cache-Control", "public, max-age=31536000, immutable");

    // Create & cache response
    const resp = new Response(upstreamResp.body, { status: upstreamResp.status, headers: respHeaders });
    ctx.waitUntil(caches.default.put(upstreamURL, resp.clone()));

    return resp;
  },
};
