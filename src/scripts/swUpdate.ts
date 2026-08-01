/** Registra o SW e avisa quando houver nova versão para atualizar. */
export function initServiceWorkerUpdate(swUrl: string, scope: string) {
	if (!('serviceWorker' in navigator)) return;

	let refreshing = false;
	let bannerShown = false;

	const showUpdateBanner = (worker: ServiceWorker) => {
		if (bannerShown) return;
		bannerShown = true;

		let banner = document.querySelector<HTMLElement>('[data-sw-update]');
		if (!banner) {
			banner = document.createElement('div');
			banner.className = 'sw-update';
			banner.dataset.swUpdate = '';
			banner.setAttribute('role', 'status');
			banner.innerHTML = `
				<p class="sw-update-text">Nova versão disponível</p>
				<button type="button" class="sw-update-btn" data-sw-update-btn>Atualizar</button>
			`;
			document.body.append(banner);
		}

		banner.dataset.visible = 'true';
		banner.querySelector<HTMLButtonElement>('[data-sw-update-btn]')?.addEventListener(
			'click',
			() => {
				worker.postMessage('SKIP_WAITING');
			},
			{ once: true },
		);
	};

	const trackInstalling = (worker: ServiceWorker | null) => {
		if (!worker) return;
		worker.addEventListener('statechange', () => {
			if (worker.state === 'installed' && navigator.serviceWorker.controller) {
				showUpdateBanner(worker);
			}
		});
	};

	navigator.serviceWorker.addEventListener('controllerchange', () => {
		if (refreshing) return;
		refreshing = true;
		window.location.reload();
	});

	void navigator.serviceWorker.register(swUrl, { scope }).then((registration) => {
		if (registration.waiting && navigator.serviceWorker.controller) {
			showUpdateBanner(registration.waiting);
		}

		registration.addEventListener('updatefound', () => {
			trackInstalling(registration.installing);
		});

		const check = () => {
			void registration.update().catch(() => {});
		};

		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') check();
		});

		window.setInterval(check, 60 * 60 * 1000);
	});
}
