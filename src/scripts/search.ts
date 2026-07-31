export function initSongSearch() {
	const input = document.querySelector<HTMLInputElement>('[data-song-search]');
	const items = Array.from(document.querySelectorAll<HTMLElement>('[data-song-item]'));
	const empty = document.querySelector<HTMLElement>('[data-empty-state]');

	if (!input || items.length === 0) return;

	const filter = () => {
		const query = input.value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
		let visible = 0;

		for (const item of items) {
			const haystack = (item.dataset.search ?? '').normalize('NFD').replace(/\p{M}/gu, '');
			const match = query === '' || haystack.includes(query);
			item.hidden = !match;
			if (match) visible += 1;
		}

		if (empty) {
			empty.hidden = visible > 0;
		}
	};

	input.addEventListener('input', filter);
	filter();
}
