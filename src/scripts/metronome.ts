export function initMetronome() {
	const root = document.querySelector<HTMLElement>('[data-metronome]');
	if (!root) return;

	const playBtn = root.querySelector<HTMLButtonElement>('[data-metro-play]');
	const bpmInput = root.querySelector<HTMLInputElement>('[data-metro-bpm]');
	const bpmLabel = root.querySelector<HTMLElement>('[data-metro-bpm-label]');
	const pulse = root.querySelector<HTMLElement>('[data-metro-pulse]');
	if (!playBtn || !bpmInput) return;

	let audioCtx: AudioContext | null = null;
	let timerId = 0;
	let nextNoteTime = 0;
	let playing = false;
	const scheduleAhead = 0.1;
	const lookAhead = 25;

	const bpm = () => {
		const value = Number(bpmInput.value);
		return Number.isFinite(value) ? Math.min(300, Math.max(30, Math.round(value))) : 80;
	};

	const syncLabel = () => {
		if (bpmLabel) bpmLabel.textContent = String(bpm());
	};

	const ensureAudio = () => {
		if (!audioCtx) {
			audioCtx = new AudioContext();
		}
		if (audioCtx.state === 'suspended') {
			void audioCtx.resume();
		}
		return audioCtx;
	};

	const click = (time: number, accent: boolean) => {
		const ctx = ensureAudio();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'square';
		osc.frequency.value = accent ? 1200 : 900;
		gain.gain.setValueAtTime(accent ? 0.22 : 0.14, time);
		gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(time);
		osc.stop(time + 0.06);
	};

	let beat = 0;

	const scheduler = () => {
		if (!audioCtx || !playing) return;
		while (nextNoteTime < audioCtx.currentTime + scheduleAhead) {
			const accent = beat % 4 === 0;
			click(nextNoteTime, accent);
			const delay = Math.max(0, (nextNoteTime - audioCtx.currentTime) * 1000);
			window.setTimeout(() => {
				if (!playing || !pulse) return;
				pulse.classList.remove('is-beat');
				void pulse.offsetWidth;
				pulse.classList.add('is-beat');
				pulse.dataset.accent = accent ? 'true' : 'false';
			}, delay);
			const secondsPerBeat = 60 / bpm();
			nextNoteTime += secondsPerBeat;
			beat += 1;
		}
		timerId = window.setTimeout(scheduler, lookAhead);
	};

	const stop = () => {
		playing = false;
		window.clearTimeout(timerId);
		beat = 0;
		playBtn.setAttribute('aria-pressed', 'false');
		playBtn.textContent = '▶';
		pulse?.classList.remove('is-beat');
	};

	const start = () => {
		const ctx = ensureAudio();
		playing = true;
		beat = 0;
		nextNoteTime = ctx.currentTime + 0.05;
		playBtn.setAttribute('aria-pressed', 'true');
		playBtn.textContent = '■';
		scheduler();
	};

	playBtn.addEventListener('click', () => {
		if (playing) stop();
		else start();
	});

	bpmInput.addEventListener('input', () => {
		syncLabel();
		if (playing && audioCtx) {
			nextNoteTime = audioCtx.currentTime + 0.05;
		}
	});

	document.addEventListener('musician:version-change', ((event: CustomEvent<{ bpm?: number }>) => {
		if (event.detail?.bpm) {
			bpmInput.value = String(event.detail.bpm);
			syncLabel();
		}
		if (playing) stop();
	}) as EventListener);

	document.addEventListener('musician:mode-change', ((event: CustomEvent<{ on: boolean }>) => {
		if (!event.detail?.on && playing) stop();
	}) as EventListener);

	syncLabel();
}
