import { showToast } from './toast';

const STORAGE_KEY = 'ipbmed-musician-mode';

export function isMusicianMode(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === '1';
	} catch {
		return false;
	}
}

export function setMusicianMode(on: boolean, options: { toast?: boolean } = {}) {
	try {
		localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
	} catch {
		/* ignore */
	}
	document.documentElement.dataset.musician = on ? 'on' : 'off';
	syncToggle(on);
	document.dispatchEvent(new CustomEvent('musician:mode-change', { detail: { on } }));

	if (options.toast) {
		showToast(on ? 'Modo músico ativado' : 'Modo músico desativado');
	}
}

function syncToggle(on: boolean) {
	const button = document.querySelector<HTMLButtonElement>('[data-musician-toggle]');
	if (!button) return;
	button.setAttribute('aria-pressed', String(on));
	button.classList.toggle('is-active', on);
}

export function initMusicianMode() {
	const button = document.querySelector<HTMLButtonElement>('[data-musician-toggle]');
	if (!button) return;

	const on = isMusicianMode();
	setMusicianMode(on);

	button.addEventListener('click', () => {
		setMusicianMode(!isMusicianMode(), { toast: true });
	});
}
