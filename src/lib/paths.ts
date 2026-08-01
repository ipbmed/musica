/** Garante barra final em BASE_URL (Astro pode omitir conforme trailingSlash). */
export function baseUrl(): string {
	const base = import.meta.env.BASE_URL || '/';
	return base.endsWith('/') ? base : `${base}/`;
}

export function withBase(path = ''): string {
	return `${baseUrl()}${path.replace(/^\//, '')}`;
}

/** Resolve link absoluto ou caminho relativo ao `base` do site. */
export function resolveHref(url: string): string {
	if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
	return withBase(url.replace(/^\//, ''));
}
