/** Garante barra final em BASE_URL (Astro pode omitir conforme trailingSlash). */
export function baseUrl(): string {
	const base = import.meta.env.BASE_URL || '/';
	return base.endsWith('/') ? base : `${base}/`;
}

export function withBase(path = ''): string {
	return `${baseUrl()}${path.replace(/^\//, '')}`;
}
