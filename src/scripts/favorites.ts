import { showToast } from './toast';

const STORAGE_KEY = 'ipbmed-favorites';
export const FAVORITES_EVENT = 'ipbmed:favorites-change';
export const MAX_REPERTOIRE = 20;

export function loadFavorites(): string[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((id): id is string => typeof id === 'string' && id.length > 0)
			.slice(0, MAX_REPERTOIRE);
	} catch {
		return [];
	}
}

function saveFavorites(ids: string[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
	document.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail: { ids } }));
}

export function isFavorite(id: string): boolean {
	return loadFavorites().includes(id);
}

export function addFavorite(id: string, options: { toast?: boolean } = {}) {
	const ids = loadFavorites();
	if (ids.includes(id)) return ids;
	if (ids.length >= MAX_REPERTOIRE) {
		if (options.toast) showToast(`Repertório limitado a ${MAX_REPERTOIRE} músicas`);
		return ids;
	}
	const next = [...ids, id];
	saveFavorites(next);
	if (options.toast) showToast('Música adicionada ao repertório');
	return next;
}

export function removeFavorite(id: string, options: { toast?: boolean } = {}) {
	const ids = loadFavorites();
	if (!ids.includes(id)) return ids;
	const next = ids.filter((item) => item !== id);
	saveFavorites(next);
	if (options.toast) showToast('Música removida do repertório');
	return next;
}

export function toggleFavorite(id: string, options: { toast?: boolean } = {}): boolean {
	if (isFavorite(id)) {
		removeFavorite(id, options);
		return false;
	}
	const next = addFavorite(id, options);
	return next.includes(id);
}

export function clearFavorites(options: { toast?: boolean } = {}) {
	saveFavorites([]);
	if (options.toast) showToast('Repertório limpo');
}

export function setFavorites(ids: string[], options: { toast?: boolean; message?: string } = {}) {
	const unique = ids.filter((id, index, list) => id && list.indexOf(id) === index);
	const next = unique.slice(0, MAX_REPERTOIRE);
	saveFavorites(next);
	if (options.toast) {
		const truncated = unique.length > MAX_REPERTOIRE;
		showToast(
			options.message ??
				(truncated
					? `Repertório limitado a ${MAX_REPERTOIRE} músicas`
					: 'Repertório atualizado'),
		);
	}
	return next;
}

/** Acrescenta ids que ainda não estão no repertório (mantém a ordem atual). */
export function mergeFavorites(ids: string[], options: { toast?: boolean; message?: string } = {}) {
	const current = loadFavorites();
	const seen = new Set(current);
	const next = [...current];
	let skipped = 0;
	for (const id of ids) {
		if (!id || seen.has(id)) continue;
		if (next.length >= MAX_REPERTOIRE) {
			skipped += 1;
			continue;
		}
		seen.add(id);
		next.push(id);
	}
	saveFavorites(next);
	if (options.toast) {
		showToast(
			options.message ??
				(skipped > 0
					? `Repertório limitado a ${MAX_REPERTOIRE} músicas`
					: 'Músicas adicionadas ao repertório'),
		);
	}
	return next;
}

export function moveFavorite(id: string, direction: -1 | 1) {
	const ids = loadFavorites();
	const index = ids.indexOf(id);
	if (index < 0) return ids;
	const target = index + direction;
	if (target < 0 || target >= ids.length) return ids;
	const next = [...ids];
	const [item] = next.splice(index, 1);
	next.splice(target, 0, item);
	saveFavorites(next);
	return next;
}

export function syncFavoriteButtons(ids = loadFavorites()) {
	const set = new Set(ids);
	for (const button of document.querySelectorAll<HTMLButtonElement>('[data-fav-toggle]')) {
		const id = button.dataset.songId;
		if (!id) continue;
		const on = set.has(id);
		button.setAttribute('aria-pressed', String(on));
		button.classList.toggle('is-active', on);
		button.title = on ? 'Remover do repertório' : 'Adicionar ao repertório';
		const icon = button.querySelector('[aria-hidden="true"]');
		if (icon) icon.textContent = on ? '★' : '☆';
		const label = button.querySelector('[data-fav-label]');
		if (label) label.textContent = on ? 'No repertório' : 'Repertório';
	}

	for (const count of document.querySelectorAll('[data-fav-count]')) {
		count.textContent = String(ids.length);
	}

	const clearBtn = document.querySelector<HTMLButtonElement>('[data-fav-clear]');
	if (clearBtn) clearBtn.disabled = ids.length === 0;

	const shareBtn = document.querySelector<HTMLButtonElement>('[data-fav-share]');
	if (shareBtn) shareBtn.disabled = ids.length === 0;
}

export function initFavoriteToggles() {
	syncFavoriteButtons();

	document.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const button = target.closest<HTMLButtonElement>('[data-fav-toggle]');
		if (!button) return;
		const id = button.dataset.songId;
		if (!id) return;
		event.preventDefault();
		event.stopPropagation();
		toggleFavorite(id, { toast: true });
	});

	document.addEventListener(FAVORITES_EVENT, ((event: CustomEvent<{ ids: string[] }>) => {
		syncFavoriteButtons(event.detail?.ids ?? loadFavorites());
	}) as EventListener);
}
