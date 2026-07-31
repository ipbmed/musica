export type TextSize = 1 | 2 | 3 | 4 | 5;
export type ContrastMode = 'normal' | 'alto' | 'escuro';
export type FontMode = 'serif' | 'sans' | 'leitura';

const STORAGE_KEY = 'ipbmed-reader-prefs';

export interface ReaderPrefs {
	size: TextSize;
	contrast: ContrastMode;
	font: FontMode;
}

const DEFAULTS: ReaderPrefs = {
	size: 3,
	contrast: 'normal',
	font: 'serif',
};

const CONTRAST_ORDER: ContrastMode[] = ['normal', 'alto', 'escuro'];
const FONT_ORDER: FontMode[] = ['serif', 'sans', 'leitura'];

function clampSize(value: number): TextSize {
	return Math.min(5, Math.max(1, Math.round(value))) as TextSize;
}

export function loadPrefs(): ReaderPrefs {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULTS };
		const parsed = JSON.parse(raw) as Partial<ReaderPrefs>;
		return {
			size: clampSize(Number(parsed.size) || DEFAULTS.size),
			contrast: CONTRAST_ORDER.includes(parsed.contrast as ContrastMode)
				? (parsed.contrast as ContrastMode)
				: DEFAULTS.contrast,
			font: FONT_ORDER.includes(parsed.font as FontMode)
				? (parsed.font as FontMode)
				: DEFAULTS.font,
		};
	} catch {
		return { ...DEFAULTS };
	}
}

export function savePrefs(prefs: ReaderPrefs) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function applyPrefs(prefs: ReaderPrefs) {
	const root = document.documentElement;
	root.dataset.textSize = String(prefs.size);
	root.dataset.contrast = prefs.contrast;
	root.dataset.font = prefs.font;

	const theme =
		prefs.contrast === 'escuro' ? '#0b1210' : prefs.contrast === 'alto' ? '#ffffff' : '#fafbfa';
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme);
}

function syncToolbar(prefs: ReaderPrefs) {
	const sizeLabel = document.querySelector('[data-reader-size-label]');
	if (sizeLabel) sizeLabel.textContent = String(prefs.size);

	for (const button of document.querySelectorAll<HTMLButtonElement>('[data-reader-contrast]')) {
		const mode = button.dataset.readerContrast as ContrastMode;
		button.setAttribute('aria-pressed', String(mode === prefs.contrast));
	}

	for (const button of document.querySelectorAll<HTMLButtonElement>('[data-reader-font]')) {
		const mode = button.dataset.readerFont as FontMode;
		button.setAttribute('aria-pressed', String(mode === prefs.font));
	}
}

export function initReaderPrefs() {
	const toolbar = document.querySelector<HTMLDetailsElement>('[data-reader-toolbar]');
	if (!toolbar) return;

	let prefs = loadPrefs();
	applyPrefs(prefs);
	syncToolbar(prefs);

	const closeToolbar = () => {
		toolbar.open = false;
	};

	const persist = () => {
		savePrefs(prefs);
		applyPrefs(prefs);
		syncToolbar(prefs);
	};

	document.addEventListener('pointerdown', (event) => {
		if (!toolbar.open) return;
		const target = event.target;
		if (!(target instanceof Node) || toolbar.contains(target)) return;
		closeToolbar();
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && toolbar.open) {
			closeToolbar();
		}
	});

	toolbar.querySelector('[data-reader-size-down]')?.addEventListener('click', () => {
		prefs = { ...prefs, size: clampSize(prefs.size - 1) };
		persist();
	});

	toolbar.querySelector('[data-reader-size-up]')?.addEventListener('click', () => {
		prefs = { ...prefs, size: clampSize(prefs.size + 1) };
		persist();
	});

	for (const button of toolbar.querySelectorAll<HTMLButtonElement>('[data-reader-contrast]')) {
		button.addEventListener('click', () => {
			const mode = button.dataset.readerContrast as ContrastMode;
			if (!CONTRAST_ORDER.includes(mode)) return;
			prefs = { ...prefs, contrast: mode };
			persist();
		});
	}

	for (const button of toolbar.querySelectorAll<HTMLButtonElement>('[data-reader-font]')) {
		button.addEventListener('click', () => {
			const mode = button.dataset.readerFont as FontMode;
			if (!FONT_ORDER.includes(mode)) return;
			prefs = { ...prefs, font: mode };
			persist();
		});
	}
}
