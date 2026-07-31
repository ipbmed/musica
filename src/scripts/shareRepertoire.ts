import { loadFavorites, MAX_REPERTOIRE, mergeFavorites, setFavorites } from './favorites';
import { withBase } from '../lib/paths';
import { showToast } from './toast';

const PARAM = 'rep';
const PURPOSE_PARAM = 'f';

export function buildRepertoireShareUrl(ids: string[] = loadFavorites(), purpose = ''): string {
	const url = new URL(withBase(), window.location.origin);
	url.searchParams.set(PARAM, ids.join(','));
	const trimmed = purpose.trim();
	if (trimmed) url.searchParams.set(PURPOSE_PARAM, trimmed);
	return url.toString();
}

export function parseRepertoireParam(raw: string | null): string[] {
	if (!raw) return [];
	return raw
		.split(',')
		.map((id) => id.trim())
		.filter((id) => id.length > 0);
}

function knownSongIds(): Set<string> {
	return new Set(
		Array.from(document.querySelectorAll<HTMLElement>('[data-song-item]'))
			.map((item) => item.dataset.songId)
			.filter((id): id is string => Boolean(id)),
	);
}

function filterKnown(ids: string[]): string[] {
	const known = knownSongIds();
	return ids.filter((id) => known.has(id));
}

function songItem(id: string) {
	return document.querySelector<HTMLElement>(`[data-song-item][data-song-id="${CSS.escape(id)}"]`);
}

export function songLabel(id: string): string {
	const item = songItem(id);
	const title = item?.dataset.title?.trim() || id;
	const number = item?.dataset.number?.trim();
	const kind = item?.dataset.kind === 'cantico' ? 'Cântico' : 'Hino';
	if (number) return `${kind} ${number} · ${title}`;
	return `${kind} · ${title}`;
}

function buildSongListText(ids: string[]): string {
	return ids.map((id, index) => `${index + 1}. ${songLabel(id)}`).join('\n');
}

export function buildShareMessage(ids: string[], purpose: string, url: string): string {
	const lines = [
		'Repertório · IPB Med Música',
		'',
		'Abra o link abaixo para importar estas músicas no app da igreja.',
	];

	const trimmed = purpose.trim();
	if (trimmed) {
		lines.push('', `Finalidade: ${trimmed}`);
	}

	lines.push('', buildSongListText(ids), '', url);
	return lines.join('\n');
}

function clearRepParams() {
	try {
		const params = new URLSearchParams(window.location.search);
		if (!params.has(PARAM) && !params.has(PURPOSE_PARAM)) return;
		params.delete(PARAM);
		params.delete(PURPOSE_PARAM);
		const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
		window.history.replaceState({}, '', next);
	} catch {
		/* ignore */
	}
}

function askImportMode(count: number, purpose: string): Promise<'add' | 'replace' | 'cancel'> {
	const dialog = document.querySelector<HTMLDialogElement>('[data-rep-import]');
	if (!dialog) {
		const purposeLine = purpose ? `\nFinalidade: ${purpose}\n` : '\n';
		const replace = confirm(
			`Já existem músicas no repertório.${purposeLine}\nOK = substituir pelas ${count} do link\nCancelar = adicionar só as novas`,
		);
		return Promise.resolve(replace ? 'replace' : 'add');
	}

	const countEl = dialog.querySelector('[data-rep-import-count]');
	if (countEl) countEl.textContent = String(count);

	const purposeEl = dialog.querySelector<HTMLElement>('[data-rep-import-purpose]');
	const purposeWrap = dialog.querySelector<HTMLElement>('[data-rep-import-purpose-wrap]');
	if (purposeEl && purposeWrap) {
		purposeEl.textContent = purpose;
		purposeWrap.hidden = !purpose;
	}

	return new Promise((resolve) => {
		const onClose = () => {
			dialog.removeEventListener('close', onClose);
			dialog.removeEventListener('click', onBackdrop);
			const value = dialog.returnValue;
			if (value === 'add' || value === 'replace') resolve(value);
			else resolve('cancel');
		};
		const onBackdrop = (event: MouseEvent) => {
			if (event.target === dialog) dialog.close('cancel');
		};
		dialog.addEventListener('close', onClose);
		dialog.addEventListener('click', onBackdrop);
		dialog.returnValue = 'cancel';
		dialog.showModal();
	});
}

/** null = cancelou; string = finalidade (pode ser vazia) */
function askShareDetails(ids: string[]): Promise<string | null> {
	const dialog = document.querySelector<HTMLDialogElement>('[data-rep-share]');
	const purposeInput = dialog?.querySelector<HTMLInputElement>('[data-rep-share-purpose]');
	const listEl = dialog?.querySelector<HTMLOListElement>('[data-rep-share-list]');

	if (!dialog || !purposeInput || !listEl) {
		const purpose = window.prompt('Finalidade do repertório (opcional):', '');
		if (purpose === null) return Promise.resolve(null);
		return Promise.resolve(purpose.trim());
	}

	listEl.replaceChildren(
		...ids.map((id) => {
			const li = document.createElement('li');
			li.textContent = songLabel(id);
			return li;
		}),
	);
	purposeInput.value = purposeInput.value.trim();

	return new Promise((resolve) => {
		const onClose = () => {
			dialog.removeEventListener('close', onClose);
			dialog.removeEventListener('click', onBackdrop);
			if (dialog.returnValue === 'share') resolve(purposeInput.value.trim());
			else resolve(null);
		};
		const onBackdrop = (event: MouseEvent) => {
			if (event.target === dialog) dialog.close('cancel');
		};
		dialog.addEventListener('close', onClose);
		dialog.addEventListener('click', onBackdrop);
		dialog.returnValue = 'cancel';
		dialog.showModal();
		purposeInput.focus();
	});
}

export async function shareCurrentRepertoire() {
	const ids = loadFavorites();
	if (ids.length === 0) {
		showToast('Repertório vazio');
		return;
	}

	const purpose = await askShareDetails(ids);
	if (purpose === null) return;

	const url = buildRepertoireShareUrl(ids, purpose);
	const title = purpose ? `Repertório · ${purpose}` : 'Repertório · IPB Med Música';
	const message = buildShareMessage(ids, purpose, url);

	if (typeof navigator.share === 'function') {
		try {
			await navigator.share({ title, text: message });
			return;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return;
		}
	}

	try {
		await navigator.clipboard.writeText(message);
		showToast('Texto e link do repertório copiados');
	} catch {
		window.prompt('Copie o repertório:', message);
	}
}

/** @returns true se o repertório foi alterado (para abrir a vista Repertório) */
export async function consumeSharedRepertoire(): Promise<boolean> {
	let raw: string | null = null;
	let purpose = '';
	try {
		const params = new URLSearchParams(window.location.search);
		raw = params.get(PARAM);
		purpose = (params.get(PURPOSE_PARAM) || '').trim();
	} catch {
		return false;
	}
	if (!raw) return false;

	const incoming = filterKnown(parseRepertoireParam(raw));
	clearRepParams();

	if (incoming.length === 0) {
		showToast('Nenhuma música válida neste link');
		return false;
	}

	const purposeNote = purpose ? ` · ${purpose}` : '';
	const current = loadFavorites();
	if (current.length === 0) {
		const saved = setFavorites(incoming, { toast: false });
		const note =
			incoming.length > MAX_REPERTOIRE ? ` (limite ${MAX_REPERTOIRE})` : '';
		showToast(`Repertório importado (${saved.length})${purposeNote}${note}`);
		return true;
	}

	const mode = await askImportMode(incoming.length, purpose);
	if (mode === 'cancel') return false;

	if (mode === 'replace') {
		const saved = setFavorites(incoming, { toast: false });
		const note =
			incoming.length > MAX_REPERTOIRE ? ` (limite ${MAX_REPERTOIRE})` : '';
		showToast(`Repertório substituído (${saved.length})${purposeNote}${note}`);
		return true;
	}

	const before = current.length;
	const next = mergeFavorites(incoming, { toast: false });
	const added = next.length - before;
	if (added === 0) {
		showToast(
			before >= MAX_REPERTOIRE
				? `Repertório limitado a ${MAX_REPERTOIRE} músicas`
				: 'Todas já estavam no repertório',
		);
	} else {
		const note = next.length >= MAX_REPERTOIRE && incoming.length > added ? ` (limite ${MAX_REPERTOIRE})` : '';
		showToast(`${added} música${added === 1 ? '' : 's'} adicionada${added === 1 ? '' : 's'}${purposeNote}${note}`);
	}
	return true;
}
