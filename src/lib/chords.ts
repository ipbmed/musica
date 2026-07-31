export interface ChordSegment {
	chord: string | null;
	text: string;
}

export interface ChordBlock {
	type: 'line' | 'break' | 'instruction';
	segments?: ChordSegment[];
	/** Texto da instrução (sem o prefixo `>`). */
	text?: string;
}

/**
 * Converte letra com `[C]` em blocos para renderizar cifra.
 * Linhas que começam com `>` são instruções (roteiro embutido).
 *
 * Ex.:
 * ```
 * > 1ª estrofe
 * [G]Grande é o Se[C]nhor
 * > Refrão
 * ```
 */
export function parseChordLyrics(lyrics: string): ChordBlock[] {
	const lines = lyrics.replace(/\r\n/g, '\n').split('\n');
	const blocks: ChordBlock[] = [];

	for (const line of lines) {
		if (line.trim() === '') {
			blocks.push({ type: 'break' });
			continue;
		}

		const instruction = line.match(/^\s*>\s*(.*)$/);
		if (instruction) {
			const text = instruction[1].trim();
			if (text) {
				blocks.push({ type: 'instruction', text });
			}
			continue;
		}

		blocks.push({ type: 'line', segments: parseChordLine(line) });
	}

	return blocks;
}

function parseChordLine(line: string): ChordSegment[] {
	const parts = line.split(/(\[[^\]]+\])/);
	const segments: ChordSegment[] = [];
	let pendingChord: string | null = null;

	for (const part of parts) {
		const chordMatch = part.match(/^\[([^\]]+)\]$/);
		if (chordMatch) {
			if (pendingChord) {
				segments.push({ chord: pendingChord, text: '' });
			}
			pendingChord = chordMatch[1];
			continue;
		}

		if (part.length === 0) continue;
		segments.push({ chord: pendingChord, text: part });
		pendingChord = null;
	}

	if (pendingChord) {
		segments.push({ chord: pendingChord, text: '' });
	}

	return segments.length > 0 ? segments : [{ chord: null, text: line }];
}
