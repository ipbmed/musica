import { initMetronome } from './metronome';

export function initMusicianPanel() {
	const panel = document.querySelector<HTMLElement>('[data-musician-panel]');
	if (!panel) return;

	const versionButtons = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-version-id]'));
	const versionBlocks = Array.from(panel.querySelectorAll<HTMLElement>('[data-version-panel]'));
	const metronome = panel.querySelector<HTMLElement>('[data-metronome]');

	const showVersion = (id: string) => {
		for (const button of versionButtons) {
			button.setAttribute('aria-pressed', String(button.dataset.versionId === id));
		}
		for (const block of versionBlocks) {
			const active = block.dataset.versionPanel === id;
			block.hidden = !active;
			if (active) {
				const bpm = Number(block.dataset.bpm || '');
				const hasBpm = Number.isFinite(bpm) && bpm > 0;
				if (metronome) metronome.hidden = !hasBpm;
				document.dispatchEvent(
					new CustomEvent('musician:version-change', {
						detail: { bpm: hasBpm ? bpm : undefined },
					}),
				);
			}
		}
	};

	for (const button of versionButtons) {
		button.addEventListener('click', () => {
			const id = button.dataset.versionId;
			if (id) showVersion(id);
		});
	}

	const initial =
		versionButtons.find((button) => button.getAttribute('aria-pressed') === 'true')?.dataset.versionId ||
		versionButtons[0]?.dataset.versionId;

	if (initial) showVersion(initial);

	type RoteiroMode = 'fechado' | 'condensado' | 'expandido';
	const ROTEIRO_MODES: RoteiroMode[] = ['fechado', 'condensado', 'expandido'];
	const ROTEIRO_STORAGE = 'ipbmed-roteiro-mode';

	const loadRoteiroMode = (): RoteiroMode => {
		try {
			const saved = localStorage.getItem(ROTEIRO_STORAGE) as RoteiroMode | null;
			if (saved && ROTEIRO_MODES.includes(saved)) return saved;
		} catch {
			/* ignore */
		}
		return 'condensado';
	};

	const saveRoteiroMode = (mode: RoteiroMode) => {
		try {
			localStorage.setItem(ROTEIRO_STORAGE, mode);
		} catch {
			/* ignore */
		}
	};

	const syncRoteiro = (roteiro: HTMLElement, mode: RoteiroMode) => {
		roteiro.dataset.roteiroMode = mode;
		const condensed = roteiro.querySelector<HTMLElement>('[data-roteiro-condensed]');
		const full = roteiro.querySelector<HTMLElement>('[data-roteiro-full]');
		if (condensed) condensed.hidden = mode !== 'condensado';
		if (full) full.hidden = mode !== 'expandido';

		for (const button of roteiro.querySelectorAll<HTMLButtonElement>('[data-roteiro-mode-btn]')) {
			const value = button.dataset.roteiroModeBtn as RoteiroMode;
			button.setAttribute('aria-pressed', String(value === mode));
		}
	};

	let roteiroMode = loadRoteiroMode();

	for (const roteiro of panel.querySelectorAll<HTMLElement>('[data-roteiro]')) {
		syncRoteiro(roteiro, roteiroMode);
		for (const button of roteiro.querySelectorAll<HTMLButtonElement>('[data-roteiro-mode-btn]')) {
			button.addEventListener('click', () => {
				const mode = button.dataset.roteiroModeBtn as RoteiroMode;
				if (!ROTEIRO_MODES.includes(mode)) return;
				roteiroMode = mode;
				saveRoteiroMode(mode);
				for (const other of panel.querySelectorAll<HTMLElement>('[data-roteiro]')) {
					syncRoteiro(other, mode);
				}
			});
		}
	}

	initMetronome();
}
