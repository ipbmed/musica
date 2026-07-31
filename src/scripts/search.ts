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
	const sortSelect = document.querySelector<HTMLSelectElement>('[data-sort-mode]');

	if (!input || !list || items.length === 0) return;

	let kind: KindFilter = 'todos';
	let letter: LetterFilter = 'todos';
	let sort: SortMode = (sortSelect?.value as SortMode) || 'numero';

	const syncLetterAvailability = () => {
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
			const itemKind = item.dataset.kind as 'hino' | 'cantico';
			const kindMatch = kind === 'todos' || itemKind === kind;
			const letterMatch = letter === 'todos' || item.dataset.letter === letter;
			const textMatch = query === '' || haystack.includes(query);
			const match = kindMatch && letterMatch && textMatch;

			item.hidden = !match;
			if (match) visible += 1;
		}

		if (empty) {
			empty.hidden = visible > 0;
		}
	};

	input.addEventListener('input', apply);

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

	sortSelect?.addEventListener('change', () => {
		sort = (sortSelect.value as SortMode) || 'numero';
		apply();
	});

	syncLetterAvailability();
	apply();
}
