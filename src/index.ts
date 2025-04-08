/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const GITHUB_BASE = 'https://github.com/';

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const pathname = url.pathname;

		// Reconstruct the GitHub URL from the path
		const target = GITHUB_BASE + pathname.slice(1); // Remove leading "/"

		try {
			const resp = await fetch(target, {
				headers: {
					// Required to follow GitHub's redirect to asset storage
					'User-Agent': 'ghproxy-worker',
				},
			});

			const headers = new Headers(resp.headers);

			// Set CORS headers
			headers.set('Access-Control-Allow-Origin', '*');
			headers.set('Access-Control-Allow-Methods', 'GET');
			headers.set('Access-Control-Allow-Headers', '*');

			return new Response(resp.body, {
				status: resp.status,
				headers,
			});
		} catch (e) {
			return new Response(`Error: ${e}`, { status: 500 });
		}
	},
};
