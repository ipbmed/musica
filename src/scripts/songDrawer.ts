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

export function initSongDrawer() {
	const drawer = document.querySelector<HTMLElement>('[data-song-drawer]');
	const openButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-drawer-open]'));
	const closeButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-drawer-close]'));
	const search = document.querySelector<HTMLInputElement>('[data-drawer-search]');
	const list = document.querySelector<HTMLElement>('[data-drawer-list]');
	const items = Array.from(document.querySelectorAll<HTMLElement>('[data-drawer-item]'));
	const empty = document.querySelector<HTMLElement>('[data-drawer-empty]');
	const kindButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-drawer-kind]'));
	const letterButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-drawer-letter]'));
	const sortSelect = document.querySelector<HTMLSelectElement>('[data-drawer-sort]');
	const current = document
		.querySelector<HTMLElement>('[data-drawer-item] a[aria-current="page"]')
		?.closest<HTMLElement>('[data-drawer-item]');

	if (!drawer || !list || openButtons.length === 0) return;

	let kind: KindFilter = 'todos';
	let letter: LetterFilter = 'todos';
	let sort: SortMode = (sortSelect?.value as SortMode) || 'numero';

	const syncLetterAvailability = () => {
		for (const button of letterButtons) {
			const value = button.dataset.drawerLetter || 'todos';
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
					other.setAttribute('aria-pressed', String(other.dataset.drawerLetter === 'todos'));
				}
			}
		}
	};

	const apply = () => {
		const query = normalize(search?.value ?? '');
		let visible = 0;

		const ordered = [...items].sort((a, b) => {
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

			const haystack = normalize(item.dataset.search ?? '');
			const kindMatch = kind === 'todos' || item.dataset.kind === kind;
			const letterMatch = letter === 'todos' || item.dataset.letter === letter;
			const textMatch = query === '' || haystack.includes(query);
			const match = kindMatch && letterMatch && textMatch;

			item.hidden = !match;
			if (match) visible += 1;
		}

		if (empty) empty.hidden = visible > 0;
	};

	const setOpen = (open: boolean) => {
		drawer.dataset.open = open ? 'true' : 'false';
		document.body.classList.toggle('drawer-open', open);

		for (const button of openButtons) {
			button.setAttribute('aria-expanded', String(open));
		}

		if (open) {
			apply();
			current?.scrollIntoView({ block: 'center' });
			window.setTimeout(() => search?.focus(), 180);
		}
	};

	for (const button of openButtons) {
		button.addEventListener('click', () => setOpen(true));
	}

	for (const button of closeButtons) {
		button.addEventListener('click', () => setOpen(false));
	}

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && drawer.dataset.open === 'true') {
			setOpen(false);
		}
	});

	const filters = document.querySelector<HTMLDetailsElement>('[data-drawer-filters]');
	const filtersAction = document.querySelector<HTMLElement>('[data-drawer-filters-action]');
	const syncFiltersLabel = () => {
		if (!filtersAction || !filters) return;
		filtersAction.textContent = filters.open ? 'Recolher' : 'Expandir';
	};
	filters?.addEventListener('toggle', syncFiltersLabel);
	syncFiltersLabel();

	search?.addEventListener('input', apply);

	for (const button of kindButtons) {
		button.addEventListener('click', () => {
			kind = (button.dataset.drawerKind as KindFilter) || 'todos';
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
			letter = button.dataset.drawerLetter || 'todos';
			for (const other of letterButtons) {
				other.setAttribute('aria-pressed', String(other === button));
			}
			apply();
		});
	}

	sortSelect?.addEventListener('change', () => {
		sort = (sortSelect.value as SortMode) || 'numero';
		apply();
	});

	syncLetterAvailability();
	apply();
	setOpen(false);
}
