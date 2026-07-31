import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pdfPath = path.join(root, 'tmp', 'Pasta de canticos IPB Medianeira.pdf');
const outDir = path.join(root, 'src', 'content', 'songs');

const LINE_MERGE = 2.5;
const STANZA_GAP = 18;
/** Números da pasta começam em 401 no app (após os hinos 1–400). */
const NUMBER_OFFSET = 400;

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

async function getPageLines(page) {
	const content = await page.getTextContent();
	const lines = [];

	for (const item of content.items) {
		const text = item.str?.replace(/\s+/g, ' ').trim();
		if (!text) continue;
		const y = item.transform[5];
		const x = item.transform[4];
		const last = lines[lines.length - 1];

		if (last && Math.abs(last.y - y) < LINE_MERGE) {
			const needsSpace = !last.text.endsWith(' ') && !last.text.endsWith('-') && !text.startsWith(',') && !text.startsWith('.') && !text.startsWith(')');
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

async function extractToc(doc) {
	const titles = new Map();

	for (const pageNum of [2, 3]) {
		const page = await doc.getPage(pageNum);
		const content = await page.getTextContent();
		const text = content.items.map((item) => item.str).join(' ');
		const re = /(\d+)\.\s+([^.][^.]*?)\s*\.{2,}/g;
		let match;
		while ((match = re.exec(text))) {
			const number = Number(match[1]);
			const title = match[2].replace(/\s+/g, ' ').trim();
			if (number >= 1 && number <= 200 && title) {
				titles.set(number, title);
			}
		}
	}

	return titles;
}

function findRefrain(stanzas) {
	if (stanzas.length < 2) return null;
	const maxLen = Math.min(6, ...stanzas.map((stanza) => stanza.length));
	let best = null;

	for (let len = maxLen; len >= 2; len -= 1) {
		for (const position of ['end', 'start']) {
			const blocks = stanzas.map((stanza) =>
				(position === 'end' ? stanza.slice(-len) : stanza.slice(0, len)).join('\n'),
			);
			const counts = new Map();
			for (const block of blocks) counts.set(block, (counts.get(block) || 0) + 1);

			for (const [block, count] of counts) {
				if (count < 2 || count < Math.ceil(stanzas.length * 0.4)) continue;
				if (!best || count > best.count || (count === best.count && len > best.len)) {
					best = { lines: block.split('\n'), count, len, position };
				}
			}
		}
	}

	return best;
}

function formatBody(lines) {
	const stanzas = [];
	let current = [];

	for (const line of lines) {
		if (current.length && line.gapBefore >= STANZA_GAP) {
			stanzas.push(current);
			current = [];
		}
		current.push(line.text);
	}
	if (current.length) stanzas.push(current);
	if (!stanzas.length) return '';

	const refrain = findRefrain(stanzas);
	const blocks = [];
	const refrainKey = refrain?.lines.join('\n');

	for (const stanza of stanzas) {
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

async function main() {
	if (!fs.existsSync(pdfPath)) {
		throw new Error(`PDF não encontrado: ${pdfPath}`);
	}

	fs.mkdirSync(outDir, { recursive: true });

	for (const file of fs.readdirSync(outDir)) {
		if (/^cantico-\d{3}-.+\.md$/.test(file)) {
			fs.unlinkSync(path.join(outDir, file));
		}
	}

	const data = new Uint8Array(fs.readFileSync(pdfPath));
	const doc = await getDocument({ data, useSystemFonts: true }).promise;
	const toc = await extractToc(doc);

	/** @type {Map<number, { number: number, title: string, lines: { text: string, gapBefore: number }[] }>} */
	const songs = new Map();
	let current = null;

	for (let pageNum = 4; pageNum <= doc.numPages; pageNum += 1) {
		const page = await doc.getPage(pageNum);
		const lines = await getPageLines(page);

		for (const line of lines) {
			if (/^I\s*P\s*B|IGREJA PRESBITERIANA|Rua Riachuelo|^\(\d{2}\)/i.test(line.text)) {
				continue;
			}

			const header = line.text.match(/^(\d+)\.\s*(.*)$/);
			if (header) {
				const number = Number(header[1]);
				if (number >= 1 && number <= 200) {
					if (current) songs.set(current.number, current);
					current = {
						number,
						title: toc.get(number) || header[2].replace(/\s+/g, ' ').trim() || `Cântico ${number}`,
						lines: [],
					};
					continue;
				}
			}

			if (current && line.text) {
				current.lines.push(line);
			}
		}
	}

	if (current) songs.set(current.number, current);

	let written = 0;
	let withRefrain = 0;

	for (const song of [...songs.values()].sort((a, b) => a.number - b.number)) {
		const body = formatBody(song.lines);
		if (!body) continue;
		if (body.includes('**Refrão**')) withRefrain += 1;

		const displayNumber = song.number + NUMBER_OFFSET;
		const slug = `cantico-${String(displayNumber).padStart(3, '0')}-${slugify(song.title)}`;
		const markdown = `---
title: ${yamlEscape(song.title)}
kind: cantico
number: ${displayNumber}
tags: ["ipb-medianeira"]
links: []
---

${body}
`;
		fs.writeFileSync(path.join(outDir, `${slug}.md`), markdown, 'utf8');
		written += 1;
	}

	const missing = [...toc.keys()].filter((n) => !songs.has(n));
	console.log(`Gerados ${written} cânticos em ${outDir}`);
	console.log(`Com refrão detectado: ${withRefrain}`);
	console.log(`Títulos no sumário: ${toc.size}`);
	if (missing.length) console.log(`Sem letra no PDF: ${missing.join(', ')}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
