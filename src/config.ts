export const GITHUB_BASE = "https://github.com";

// Whitelist of allowed GitHub paths
export const PATH_WHITELIST: RegExp[] = [/^\/MaxMaeder\/OpenPin\/releases\/download\/[\w\-.~/%+]+$/i];

export const isPathAllowed = (path: string): boolean => {
  return PATH_WHITELIST.some((rex) => rex.test(path));
};

export function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    Vary: "Origin",
  };
}
