function isChorusLabel(text: string) {
	return /^refr[aã]o\b/i.test(text.trim());
}

function sectionLabel(el: Element): string | null {
	const strong = el.querySelector(':scope > strong, :scope strong');
	if (!strong) return null;
	// Só conta como rótulo de seção se o strong for o início do bloco
	const first = el.firstElementChild;
	if (first && first !== strong && !first.contains(strong)) {
		const textBefore = (el.textContent || '').trim().indexOf(strong.textContent || '');
		if (textBefore > 0) return null;
	}
	return strong.textContent?.trim() || null;
}

function hasTextBeyondLabel(el: Element): boolean {
	const clone = el.cloneNode(true) as HTMLElement;
	for (const strong of clone.querySelectorAll('strong')) {
		strong.remove();
	}
	return (clone.textContent || '').trim().length > 0;
}

/**
 * Marca o bloco imediato após `**Refrão**`.
 * - Se o rótulo e a letra estão no mesmo `<p>`, marca esse `<p>`.
 * - Senão, marca só o(s) próximo(s) `<blockquote>` consecutivos,
 *   ou um único parágrafo seguinte (não continua nas estrofes).
 */
export function markChorusSections() {
	const lyrics = document.querySelector('[data-lyrics]');
	if (!lyrics) return;

	const children = Array.from(lyrics.children);

	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		const label = sectionLabel(child);
		if (!label || !isChorusLabel(label)) continue;

		if (hasTextBeyondLabel(child)) {
			child.classList.add('lyrics-chorus');
			continue;
		}

		let j = i + 1;
		if (j >= children.length) continue;

		if (children[j].tagName === 'BLOCKQUOTE') {
			while (j < children.length && children[j].tagName === 'BLOCKQUOTE') {
				children[j].classList.add('lyrics-chorus');
				j += 1;
			}
			continue;
		}

		if (!sectionLabel(children[j])) {
			children[j].classList.add('lyrics-chorus');
		}
	}
}

export function initLyricsChorus() {
	markChorusSections();
}
