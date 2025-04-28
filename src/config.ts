export const GITHUB_BASE = 'https://github.com';

// Whitelist of allowed GitHub paths
export const PATH_WHITELIST: RegExp[] = [/^\/MaxMaeder\/OpenPin\/releases\/download\/[\w\-.~/%+]+$/i];

// Allowed CORS origin
export const CORS_ORIGIN = 'https://openpin.org';

export const isPathAllowed = (path: string): boolean => {
	return PATH_WHITELIST.some((rex) => rex.test(path));
};

export function corsHeaders(): HeadersInit {
	return {
		'Access-Control-Allow-Origin': CORS_ORIGIN,
		'Access-Control-Allow-Methods': 'GET',
		'Access-Control-Allow-Headers': '*',
		Vary: 'Origin',
	};
}
