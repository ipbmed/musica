let hideTimer = 0;

export function showToast(message: string, durationMs = 2200) {
	let toast = document.querySelector<HTMLElement>('[data-toast]');
	if (!toast) {
		toast = document.createElement('div');
		toast.className = 'app-toast';
		toast.dataset.toast = '';
		toast.setAttribute('role', 'status');
		toast.setAttribute('aria-live', 'polite');
		document.body.append(toast);
	}

	toast.textContent = message;
	toast.dataset.visible = 'true';

	window.clearTimeout(hideTimer);
	hideTimer = window.setTimeout(() => {
		toast.dataset.visible = 'false';
	}, durationMs);
}
