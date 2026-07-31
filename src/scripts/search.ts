import {
	clearFavorites,
	FAVORITES_EVENT,
	initFavoriteToggles,
	loadFavorites,
	moveFavorite,
	removeFavorite,
} from './favorites';

type KindFilter = 'todos' | 'hino' | 'cantico';
type SortMode = 'numero' | 'titulo';
type LetterFilter = 'todos' | string;

function normalize(value: string) {
	return value
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '');
}

export function initSongSearch() {
	const input = document.querySelector<HTMLInputElement>('[data-song-search]');
	const list = document.querySelector<HTMLElement>('[data-song-list]');
	const items = Array.from(document.querySelectorAll<HTMLElement>('[data-song-item]'));
	const empty = document.querySelector<HTMLElement>('[data-empty-state]');
	const kindButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-kind-filter]'));
	const letterButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-letter-filter]'));
	const sortButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-sort-mode]'));
	const favFilterBtn = document.querySelector<HTMLButtonElement>('[data-fav-filter]');
	const catalogFilters = document.querySelector<HTMLElement>('[data-catalog-filters]');
	const favActions = document.querySelector<HTMLElement>('[data-fav-actions]');

	if (!input || !list || items.length === 0) return;

	initFavoriteToggles();

	let kind: KindFilter = 'todos';
	let letter: LetterFilter = 'todos';
	let sort: SortMode =
		(sortButtons.find((button) => button.getAttribute('aria-pressed') === 'true')?.dataset.sortMode as SortMode) ||
		'numero';
	let favoritesOnly = favFilterBtn?.getAttribute('aria-pressed') === 'true';

	try {
		const params = new URLSearchParams(window.location.search);
		if (params.get('repertorio') === '1') {
			favoritesOnly = true;
			params.delete('repertorio');
			const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
			window.history.replaceState({}, '', next);
		}
	} catch {
		/* ignore */
	}

	const syncViewChrome = () => {
		document.documentElement.dataset.listView = favoritesOnly ? 'repertorio' : 'todas';
		if (catalogFilters) catalogFilters.hidden = favoritesOnly;
		if (favActions) favActions.hidden = !favoritesOnly;
		input.placeholder = favoritesOnly ? 'Buscar no repertório' : 'Buscar título, número ou tag';

		if (favFilterBtn) {
			favFilterBtn.setAttribute('aria-pressed', String(favoritesOnly));
			favFilterBtn.classList.toggle('is-active', favoritesOnly);
			favFilterBtn.title = favoritesOnly ? 'Mostrar todas as músicas' : 'Mostrar somente o repertório';
			const icon = favFilterBtn.querySelector('[aria-hidden="true"]');
			if (icon) icon.textContent = favoritesOnly ? '★' : '☆';
		}
	};

	const syncLetterAvailability = () => {
		if (favoritesOnly) return;
		for (const button of letterButtons) {
			const value = button.dataset.letterFilter || 'todos';
			if (value === 'todos') {
				button.disabled = false;
				continue;
			}

			const available = items.some((item) => {
				const kindMatch = kind === 'todos' || item.dataset.kind === kind;
				return kindMatch && item.dataset.letter === value;
			});
			button.disabled = !available;
			if (!available && letter === value) {
				letter = 'todos';
				for (const other of letterButtons) {
					other.setAttribute('aria-pressed', String(other.dataset.letterFilter === 'todos'));
				}
			}
		}
	};

	const apply = () => {
		const query = normalize(input.value);
		const favorites = loadFavorites();
		const favIndex = new Map(favorites.map((id, index) => [id, index]));
		let visible = 0;

		const ordered = [...items].sort((a, b) => {
			if (favoritesOnly) {
				const aIdx = favIndex.get(a.dataset.songId ?? '') ?? Number.POSITIVE_INFINITY;
				const bIdx = favIndex.get(b.dataset.songId ?? '') ?? Number.POSITIVE_INFINITY;
				return aIdx - bIdx;
			}

			if (sort === 'titulo') {
				return (a.dataset.title ?? '').localeCompare(b.dataset.title ?? '', 'pt-BR');
			}

			const aNum = Number(a.dataset.number || Number.POSITIVE_INFINITY);
			const bNum = Number(b.dataset.number || Number.POSITIVE_INFINITY);
			if (aNum !== bNum) return aNum - bNum;
			return (a.dataset.title ?? '').localeCompare(b.dataset.title ?? '', 'pt-BR');
		});

		for (const item of ordered) {
			list.appendChild(item);
			const id = item.dataset.songId ?? '';
			const inFavorites = favIndex.has(id);

			const haystack = normalize(item.dataset.search ?? '');
			const itemKind = item.dataset.kind as 'hino' | 'cantico';
			const textMatch = query === '' || haystack.includes(query);

			let match = textMatch;
			if (favoritesOnly) {
				match = inFavorites && textMatch;
			} else {
				const kindMatch = kind === 'todos' || itemKind === kind;
				const letterMatch = letter === 'todos' || item.dataset.letter === letter;
				match = kindMatch && letterMatch && textMatch;
			}

			item.hidden = !match;
			item.classList.toggle('is-favorite', inFavorites);
			item.dataset.favIndex = inFavorites ? String(favIndex.get(id)) : '';

			const up = item.querySelector<HTMLButtonElement>('[data-fav-up]');
			const down = item.querySelector<HTMLButtonElement>('[data-fav-down]');
			if (up && down && favoritesOnly && match) {
				const position = favorites.indexOf(id);
				up.disabled = position <= 0;
				down.disabled = position < 0 || position >= favorites.length - 1;
			}

			if (match) visible += 1;
		}

		if (empty) {
			empty.hidden = visible > 0;
			if (favoritesOnly && favorites.length === 0) {
				empty.textContent = 'Nenhuma música no repertório. Toque na estrela para adicionar.';
			} else if (favoritesOnly) {
				empty.textContent = 'Nenhuma música do repertório corresponde à busca.';
			} else {
				empty.textContent = 'Nenhuma música encontrada.';
			}
		}
	};

	input.addEventListener('input', apply);

	favFilterBtn?.addEventListener('click', () => {
		favoritesOnly = !favoritesOnly;
		syncViewChrome();
		syncLetterAvailability();
		apply();
	});

	for (const button of kindButtons) {
		button.addEventListener('click', () => {
			kind = (button.dataset.kindFilter as KindFilter) || 'todos';
			for (const other of kindButtons) {
				other.setAttribute('aria-pressed', String(other === button));
			}
			syncLetterAvailability();
			apply();
		});
	}

	for (const button of letterButtons) {
		button.addEventListener('click', () => {
			if (button.disabled) return;
			letter = button.dataset.letterFilter || 'todos';
			for (const other of letterButtons) {
				other.setAttribute('aria-pressed', String(other === button));
			}
			apply();
		});
	}

	for (const button of sortButtons) {
		button.addEventListener('click', () => {
			sort = (button.dataset.sortMode as SortMode) || 'numero';
			for (const other of sortButtons) {
				other.setAttribute('aria-pressed', String(other === button));
			}
			apply();
		});
	}

	document.querySelector('[data-fav-clear]')?.addEventListener('click', () => {
		if (loadFavorites().length === 0) return;
		if (!confirm('Limpar todo o repertório?')) return;
		clearFavorites({ toast: true });
	});

	list.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;

		const up = target.closest<HTMLButtonElement>('[data-fav-up]');
		if (up) {
			const id = up.closest<HTMLElement>('[data-song-item]')?.dataset.songId;
			if (id) moveFavorite(id, -1);
			return;
		}

		const down = target.closest<HTMLButtonElement>('[data-fav-down]');
		if (down) {
			const id = down.closest<HTMLElement>('[data-song-item]')?.dataset.songId;
			if (id) moveFavorite(id, 1);
			return;
		}

		const remove = target.closest<HTMLButtonElement>('[data-fav-remove]');
		if (remove) {
			const id = remove.closest<HTMLElement>('[data-song-item]')?.dataset.songId;
			if (id) removeFavorite(id, { toast: true });
		}
	});

	document.addEventListener(FAVORITES_EVENT, () => apply());

	syncViewChrome();
	syncLetterAvailability();
	apply();
}
