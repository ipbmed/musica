import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pdfPath = path.join(root, 'tmp', 'novo_cantico.pdf');
const outDir = path.join(root, 'src', 'content', 'songs');

/** Gap (PDF units) larger than this starts a new stanza. */
const STANZA_GAP = 25;
/** Merge text items closer than this on the Y axis into one line. */
const LINE_MERGE = 2.5;

function slugify(value) {
	return value
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function yamlEscape(value) {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function countRepeats(blocks) {
	const counts = new Map();
	for (const block of blocks) {
		counts.set(block, (counts.get(block) || 0) + 1);
	}
	return counts;
}

function findRefrain(stanzas) {
	if (stanzas.length < 2) return null;

	const maxLen = Math.min(6, ...stanzas.map((stanza) => stanza.length));
	let best = null;

	for (let len = maxLen; len >= 2; len -= 1) {
		const endings = stanzas.map((stanza) => stanza.slice(-len).join('\n'));
		const beginnings = stanzas.map((stanza) => stanza.slice(0, len).join('\n'));

		for (const [position, blocks] of [
			['end', endings],
			['start', beginnings],
		]) {
			for (const [block, count] of countRepeats(blocks)) {
				if (count < 2) continue;
				if (count < Math.ceil(stanzas.length * 0.4)) continue;
				if (!best || count > best.count || (count === best.count && len > best.len)) {
					best = { lines: block.split('\n'), count, len, position };
				}
			}
		}
	}

	return best;
}

function unpackPackedQuatrains(stanzas) {
	if (!stanzas.length) return stanzas;
	if (!stanzas.every((stanza) => stanza.length >= 4 && stanza.length % 4 === 0)) return stanzas;
	if (!stanzas.some((stanza) => stanza.length >= 8)) return stanzas;

	return stanzas.flatMap((stanza) => {
		const parts = [];
		for (let i = 0; i < stanza.length; i += 4) {
			parts.push(stanza.slice(i, i + 4));
		}
		return parts;
	});
}

function formatBody(stanzas) {
	const refrain = findRefrain(stanzas);
	const normalized = refrain ? stanzas : unpackPackedQuatrains(stanzas);
	const blocks = [];
	const refrainKey = refrain?.lines.join('\n');

	for (const stanza of normalized) {
		if (!refrain || stanza.length <= refrain.len) {
			blocks.push(stanza.join('\n'));
			continue;
		}

		const startKey = stanza.slice(0, refrain.len).join('\n');
		const endKey = stanza.slice(-refrain.len).join('\n');

		if (refrain.position === 'start' && startKey === refrainKey) {
			blocks.push(`**Refrão**\n${refrain.lines.join('\n')}`);
			const verse = stanza.slice(refrain.len);
			if (verse.length) blocks.push(verse.join('\n'));
			continue;
		}

		if (endKey === refrainKey) {
			const verse = stanza.slice(0, -refrain.len);
			if (verse.length) blocks.push(verse.join('\n'));
			blocks.push(`**Refrão**\n${refrain.lines.join('\n')}`);
			continue;
		}

		blocks.push(stanza.join('\n'));
	}

	return blocks.join('\n\n');
}

async function extractLinesFromPage(page) {
	const content = await page.getTextContent();
	const lines = [];

	for (const item of content.items) {
		const text = item.str?.replace(/\s+/g, ' ').trim();
		if (!text) continue;

		const y = item.transform[5];
		const x = item.transform[4];
		const last = lines[lines.length - 1];

		if (last && Math.abs(last.y - y) < LINE_MERGE) {
			const needsSpace = !last.text.endsWith(' ') && !text.startsWith(',') && !text.startsWith('.');
			last.text += (needsSpace ? ' ' : '') + text;
			last.x = Math.min(last.x, x);
			continue;
		}

		lines.push({ y, x, text });
	}

	lines.sort((a, b) => b.y - a.y || a.x - b.x);
	return lines.map((line, index) => ({
		text: line.text.replace(/\s+,/g, ',').replace(/\s+\./g, '.').trim(),
		gapBefore: index === 0 ? 0 : lines[index - 1].y - line.y,
	}));
}

function parseHymnFromLines(lines) {
	if (!lines.length) return null;

	const header = lines[0].text.match(/^(\d+)\s+(.+)$/);
	if (!header) return null;

	const number = Number(header[1]);
	if (!Number.isInteger(number) || number < 1 || number > 400) return null;

	const title = header[2].replace(/\.$/, '').trim();
	const bodyLines = lines.slice(1).filter((line) => line.text.length > 0);
	if (!bodyLines.length) return null;

	const stanzas = [];
	let current = [];

	for (const line of bodyLines) {
		if (current.length && line.gapBefore >= STANZA_GAP) {
			stanzas.push(current);
			current = [];
		}
		current.push(line.text);
	}
	if (current.length) stanzas.push(current);

	return {
		number,
		title,
		stanzas,
		body: formatBody(stanzas),
	};
}

async function main() {
	if (!fs.existsSync(pdfPath)) {
		throw new Error(`PDF não encontrado em ${pdfPath}. Baixe novo_cantico.pdf para tmp/.`);
	}

	fs.mkdirSync(outDir, { recursive: true });

	for (const file of fs.readdirSync(outDir)) {
		if (/^hino-\d{3}-.+\.md$/.test(file)) {
			fs.unlinkSync(path.join(outDir, file));
		}
	}

	const data = new Uint8Array(fs.readFileSync(pdfPath));
	const doc = await getDocument({ data, useSystemFonts: true }).promise;
	const hymns = new Map();
	let multiStanza = 0;
	let withRefrain = 0;

	for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
		const page = await doc.getPage(pageNum);
		const lines = await extractLinesFromPage(page);
		const hymn = parseHymnFromLines(lines);
		if (!hymn || hymns.has(hymn.number)) continue;

		hymns.set(hymn.number, hymn);
		if (hymn.stanzas.length > 1) multiStanza += 1;
		if (hymn.body.includes('**Refrão**')) withRefrain += 1;

		const slug = `hino-${String(hymn.number).padStart(3, '0')}-${slugify(hymn.title)}`;
		const markdown = `---
title: ${yamlEscape(hymn.title)}
kind: hino
number: ${hymn.number}
tags: ["novo-cantico"]
links: []
---

${hymn.body}
`;
		fs.writeFileSync(path.join(outDir, `${slug}.md`), markdown, 'utf8');
	}

	const missing = [...Array(400)].map((_, i) => i + 1).filter((n) => !hymns.has(n));
	console.log(`Gerados ${hymns.size} hinos em ${outDir}`);
	console.log(`Com mais de uma estrofe: ${multiStanza}`);
	console.log(`Com refrão detectado: ${withRefrain}`);
	if (missing.length) {
		console.log(`Ausentes no PDF: ${missing.join(', ')}`);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
