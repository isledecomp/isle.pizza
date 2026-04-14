import AnimationTitles from '../../src/data/animation-titles.json';
import ActorDisplayNames from '../../src/data/actor-display-names.json';
import { fromUrlSafeBase64 } from '../../src/core/base64.js';

interface Env {
	ASSETS: R2Bucket;
	API_URL: string;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function formatDateTime(timestamp: number): string {
	if (!timestamp) return '';
	const d = new Date(timestamp * 1000);
	const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	return `${date} \u00b7 ${time}`;
}

interface Participant {
	n?: string;
	displayName?: string;
	c?: number;
	charIndex?: number;
}

function buildDescription(participants: Participant[], timestamp?: number): string {
	const parts: string[] = [];
	for (const p of participants) {
		const name = p.displayName || p.n || 'Unknown';
		const charIndex = p.charIndex ?? p.c ?? 0;
		const charName = (ActorDisplayNames as string[])[charIndex] || `#${charIndex}`;
		parts.push(`${name} as ${charName}`);
	}
	if (timestamp) {
		parts.push(formatDateTime(timestamp));
	}
	return parts.join(' \u00b7 ');
}

function injectOgTags(html: string, title: string, description: string, url: string): string {
	const safeTitle = escapeHtml(title);
	const safeDesc = escapeHtml(description);
	const safeUrl = escapeHtml(url);
	const fullTitle = `${safeTitle} — LEGO® Island`;

	html = html.replace(/<title>[^<]*<\/title>/, `<title>${fullTitle}</title>`);

	html = html.replace(
		/(<meta\s+property="og:title"\s+content=")[^"]*(")/,
		`$1${safeTitle}$2`
	);
	html = html.replace(
		/(<meta\s+property="og:description"\s+content=")[^"]*(")/,
		`$1${safeDesc}$2`
	);
	html = html.replace(
		/(<meta\s+property="og:url"\s+content=")[^"]*(")/,
		`$1${safeUrl}$2`
	);

	html = html.replace(
		/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
		`$1${safeTitle}$2`
	);
	html = html.replace(
		/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
		`$1${safeDesc}$2`
	);
	html = html.replace(
		/(<meta\s+name="twitter:url"\s+content=")[^"]*(")/,
		`$1${safeUrl}$2`
	);

	html = html.replace(
		/(<meta\s+name="description"\s+content=")[^"]*(")/,
		`$1${safeDesc}$2`
	);

	html = html.replace(
		/(<link\s+rel="canonical"\s+href=")[^"]*(")/,
		`$1${safeUrl}$2`
	);

	return html;
}

function getR2Prefix(request: Request): string {
	const hostname = new URL(request.url).hostname;
	return hostname.startsWith('dev.') ? 'dev/' : '';
}

async function getIndexHtml(request: Request, env: Env): Promise<string> {
	const key = `${getR2Prefix(request)}index.html`;
	const obj = await env.ASSETS.get(key);
	if (!obj) throw new Error(`${key} not found in R2`);
	return obj.text();
}

async function handleMemory(eventId: string, request: Request, env: Env): Promise<Response> {
	const html = await getIndexHtml(request, env);

	try {
		const apiRes = await fetch(`${env.API_URL}/api/memory/${encodeURIComponent(eventId)}`);
		if (!apiRes.ok) {
			return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
		}

		const data = await apiRes.json() as {
			animIndex: number;
			participants: Participant[];
			completedAt?: number;
		};

		const titles = AnimationTitles as Record<string, string>;
		const title = titles[String(data.animIndex)] || `Animation #${data.animIndex}`;
		const description = buildDescription(data.participants, data.completedAt);
		const url = new URL(request.url);

		return new Response(injectOgTags(html, title, description, url.href), {
			headers: {
				'content-type': 'text/html; charset=utf-8',
				'cache-control': 'public, max-age=300',
			},
		});
	} catch {
		return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
	}
}

async function handleScene(encoded: string, request: Request, env: Env): Promise<Response> {
	const html = await getIndexHtml(request, env);

	try {
		const json = fromUrlSafeBase64(encoded);
		const data = JSON.parse(json) as {
			a: number;
			p: Array<{ n: string; c: number }>;
			t?: number;
		};

		const titles = AnimationTitles as Record<string, string>;
		const title = titles[String(data.a)] || `Animation #${data.a}`;
		const participants = data.p.map(p => ({ n: p.n, c: p.c }));
		const description = buildDescription(participants, data.t);
		const url = new URL(request.url);

		return new Response(injectOgTags(html, title, description, url.href), {
			headers: {
				'content-type': 'text/html; charset=utf-8',
				'cache-control': 'public, max-age=3600',
			},
		});
	} catch {
		return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
	}
}

async function handleLatestMemories(request: Request, env: Env): Promise<Response> {
	let html = await getIndexHtml(request, env);
	const url = new URL(request.url);

	html = injectOgTags(
		html,
		'Latest Memories',
		'The most recent animations reenacted by players across all LEGO Islands.',
		url.href
	);
	const origin = url.origin;

	try {
		const apiRes = await fetch(`${env.API_URL}/api/memories/latest`);
		if (apiRes.ok) {
			const data = await apiRes.json() as {
				entries: Array<{
					animIndex: number;
					eventId: string;
					completedAt: number;
					participants: Participant[];
					language: string;
				}>;
			};

			const titles = AnimationTitles as Record<string, string>;
			const items = data.entries.map((entry) => {
				const title = escapeHtml(titles[String(entry.animIndex)] || `Animation #${entry.animIndex}`);
				const desc = escapeHtml(buildDescription(entry.participants, entry.completedAt));
				const url = `${origin}/memory/${escapeHtml(entry.eventId)}`;
				return `<li><a href="${url}"><strong>${title}</strong><br>${desc}</a></li>`;
			}).join('\n');

			const ssrBlock = `<div id="ssr-latest-memories" style="display:none" aria-hidden="true"><h1>Latest Memories</h1><p>The most recent animations reenacted by players across all LEGO Islands.</p><ol>${items}</ol></div>`;
			html = html.replace('</body>', `${ssrBlock}\n</body>`);
		}
	} catch {
		// Fail gracefully — SPA will fetch client-side
	}

	return new Response(html, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'public, max-age=300',
		},
	});
}

async function handleSitemap(request: Request, env: Env): Promise<Response> {
	const origin = new URL(request.url).origin;

	try {
		const apiRes = await fetch(`${env.API_URL}/api/sitemap`);
		if (!apiRes.ok) {
			return new Response('Failed to fetch sitemap data', { status: 502 });
		}

		const data = await apiRes.json() as {
			entries: Array<{ event_id: string; completed_at: number }>;
		};

		const urls: string[] = [
			`  <url>`,
			`    <loc>${escapeHtml(origin)}/</loc>`,
			`  </url>`,
			`  <url>`,
			`    <loc>${escapeHtml(origin)}/memories</loc>`,
			`  </url>`,
		];

		for (const entry of data.entries) {
			const lastmod = new Date(entry.completed_at * 1000).toISOString().split('T')[0];
			urls.push(
				`  <url>`,
				`    <loc>${escapeHtml(origin)}/memory/${escapeHtml(entry.event_id)}</loc>`,
				`    <lastmod>${lastmod}</lastmod>`,
				`  </url>`,
			);
		}

		const xml = [
			`<?xml version="1.0" encoding="UTF-8"?>`,
			`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
			...urls,
			`</urlset>`,
		].join('\n');

		return new Response(xml, {
			headers: {
				'content-type': 'application/xml; charset=utf-8',
				'cache-control': 'public, max-age=3600',
			},
		});
	} catch {
		return new Response('Failed to generate sitemap', { status: 500 });
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		if (path === '/sitemap.xml') {
			return handleSitemap(request, env);
		}

		if (path === '/memories') {
			return handleLatestMemories(request, env);
		}

		const memoryMatch = path.match(/^\/memory\/([A-Za-z0-9_-]+)$/);
		if (memoryMatch) {
			return handleMemory(memoryMatch[1], request, env);
		}

		const sceneMatch = path.match(/^\/scene\/([A-Za-z0-9_-]+)$/);
		if (sceneMatch) {
			return handleScene(sceneMatch[1], request, env);
		}

		return new Response('Not found', { status: 404 });
	},
};
