import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public', 'images', 'logo-ipb.png');

/**
 * Remove o fundo preto da logo IPB (sarça) e gera versões para o site.
 */
async function main() {
	if (!fs.existsSync(source)) {
		throw new Error(`Fonte não encontrada: ${source}`);
	}

	const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const out = Buffer.from(data);
	let minX = info.width;
	let minY = info.height;
	let maxX = 0;
	let maxY = 0;

	for (let y = 0; y < info.height; y += 1) {
		for (let x = 0; x < info.width; x += 1) {
			const i = (y * info.width + x) * 4;
			const r = out[i];
			const g = out[i + 1];
			const b = out[i + 2];
			const isGreen = g > r + 15 && g > b + 15 && g > 40;
			const isDark = Math.max(r, g, b) < 45;

			if (!isGreen || isDark) {
				out[i + 3] = 0;
				continue;
			}

			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
		}
	}

	const pad = 20;
	minX = Math.max(0, minX - pad);
	minY = Math.max(0, minY - pad);
	maxX = Math.min(info.width - 1, maxX + pad);
	maxY = Math.min(info.height - 1, maxY + pad);

	const cropped = path.join(root, 'public', 'logo-ipb.png');
	await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
		.extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
		.png()
		.toFile(cropped);

	await sharp(cropped).resize({ width: 320 }).png().toFile(path.join(root, 'public', 'logo.png'));
	await sharp(cropped).resize({ width: 96 }).png().toFile(path.join(root, 'public', 'favicon-ipb.png'));

	console.log('Logo processada: public/logo.png e public/favicon-ipb.png');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
