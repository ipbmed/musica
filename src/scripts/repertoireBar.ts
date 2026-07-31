import { FAVORITES_EVENT, loadFavorites } from './favorites';
import { withBase } from '../lib/paths';

interface SongMeta {
	id: string;
	title: string;
	kind: 'hino' | 'cantico';
	number?: number;
}

function songHref(id: string) {
	return withBase(`musica/${id}/`);
}

function labelFor(song: SongMeta) {
	const num = song.number !== undefined ? `${song.number} · ` : '';
	return `${num}${song.title}`;
}

export function initRepertoireBar() {
	const bar = document.querySelector<HTMLElement>('[data-repertoire-bar]');
	if (!bar) return;

	const catalogEl = document.querySelector<HTMLScriptElement>('[data-repertoire-catalog]');
	const currentId = bar.dataset.currentId || '';
	let catalog: SongMeta[] = [];

	try {
		catalog = JSON.parse(catalogEl?.textContent || '[]') as SongMeta[];
	} catch {
		catalog = [];
	}

	const byId = new Map(catalog.map((song) => [song.id, song]));
	const prevBtn = bar.querySelector<HTMLButtonElement>('[data-rep-prev]');
	const nextBtn = bar.querySelector<HTMLButtonElement>('[data-rep-next]');
	const pickerBtn = bar.querySelector<HTMLButtonElement>('[data-rep-picker]');
	const manageLink = document.querySelector<HTMLAnchorElement>('[data-rep-manage]');
	const posEl = bar.querySelector<HTMLElement>('[data-rep-pos]');
	const titleEl = bar.querySelector<HTMLElement>('[data-rep-title]');
	const sheet = document.querySelector<HTMLElement>('[data-rep-sheet]');
	const sheetList = document.querySelector<HTMLElement>('[data-rep-sheet-list]');
	const sheetClose = document.querySelectorAll('[data-rep-sheet-close]');

	if (manageLink) {
		manageLink.href = withBase('?repertorio=1');
	}

	const closeSheet = () => {
		if (!sheet) return;
		sheet.dataset.open = 'false';
		document.body.classList.remove('rep-sheet-open');
		pickerBtn?.setAttribute('aria-expanded', 'false');
	};

	const openSheet = () => {
		if (!sheet) return;
		sheet.dataset.open = 'true';
		document.body.classList.add('rep-sheet-open');
		pickerBtn?.setAttribute('aria-expanded', 'true');
	};

	const renderSheet = (ids: string[]) => {
		if (!sheetList) return;
		sheetList.replaceChildren();

		ids.forEach((id, index) => {
			const song = byId.get(id);
			if (!song) return;

			const item = document.createElement('li');
			const link = document.createElement('a');
			link.href = songHref(id);
			link.className = 'rep-sheet-link';
			if (id === currentId) link.setAttribute('aria-current', 'page');

			const order = document.createElement('span');
			order.className = 'rep-sheet-order';
			order.textContent = String(index + 1);

			const meta = document.createElement('span');
			meta.className = 'rep-sheet-meta';
			meta.innerHTML = `<span class="rep-sheet-kind">${song.kind === 'hino' ? 'Hino' : 'Cântico'}</span><span class="rep-sheet-name">${labelFor(song)}</span>`;

			link.append(order, meta);
			item.append(link);
			sheetList.append(item);
		});
	};

	const sync = () => {
		const ids = loadFavorites().filter((id) => byId.has(id));
		const active = ids.length > 0;
		bar.hidden = !active;
		document.body.classList.toggle('has-repertoire-bar', active);

		if (!active) {
			closeSheet();
			return;
		}

		const index = ids.indexOf(currentId);
		const inList = index >= 0;
		const prevId = inList ? ids[(index - 1 + ids.length) % ids.length] : ids[ids.length - 1];
		const nextId = inList ? ids[(index + 1) % ids.length] : ids[0];

		if (prevBtn) {
			prevBtn.disabled = ids.length < 2;
			prevBtn.dataset.href = songHref(prevId);
		}
		if (nextBtn) {
			nextBtn.disabled = ids.length < 2;
			nextBtn.dataset.href = songHref(nextId);
		}

		if (posEl) {
			posEl.textContent = inList ? `${index + 1}/${ids.length}` : `—/${ids.length}`;
		}
		if (titleEl) {
			const current = byId.get(currentId);
			titleEl.textContent = inList && current ? labelFor(current) : 'Repertório';
		}

		renderSheet(ids);
	};

	prevBtn?.addEventListener('click', () => {
		const href = prevBtn.dataset.href;
		if (href) window.location.href = href;
	});

	nextBtn?.addEventListener('click', () => {
		const href = nextBtn.dataset.href;
		if (href) window.location.href = href;
	});

	pickerBtn?.addEventListener('click', () => {
		if (sheet?.dataset.open === 'true') closeSheet();
		else openSheet();
	});

	for (const button of sheetClose) {
		button.addEventListener('click', closeSheet);
	}

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && sheet?.dataset.open === 'true') {
			closeSheet();
		}
	});

	document.addEventListener(FAVORITES_EVENT, () => sync());
	sync();
}
