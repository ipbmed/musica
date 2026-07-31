import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logo = path.join(root, 'public', 'logo.png');
const outDir = path.join(root, 'public', 'icons');
const brand = { r: 15, g: 92, b: 82, alpha: 1 };
const mark = { r: 250, g: 251, b: 250 }; // sarça clara sobre o verde do app

/**
 * Recolore pixels opacos da logo para o tom claro do app (contraste no fundo brand).
 */
async function lightLogo(size) {
	const { data, info } = await sharp(logo)
		.resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	const out = Buffer.from(data);
	for (let i = 0; i < out.length; i += 4) {
		const alpha = out[i + 3];
		if (alpha < 16) {
			out[i + 3] = 0;
			continue;
		}
		out[i] = mark.r;
		out[i + 1] = mark.g;
		out[i + 2] = mark.b;
	}

	return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function icon(size, file, paddingRatio = 0.18) {
	const pad = Math.round(size * paddingRatio);
	const inner = Math.max(8, size - pad * 2);
	const markBuf = await lightLogo(inner);

	await sharp({
		create: {
			width: size,
			height: size,
			channels: 4,
			background: brand,
		},
	})
		.composite([{ input: markBuf, gravity: 'centre' }])
		.png()
		.toFile(file);
}

async function main() {
	if (!fs.existsSync(logo)) {
		throw new Error(`Logo não encontrada: ${logo}`);
	}

	fs.mkdirSync(outDir, { recursive: true });

	await icon(192, path.join(outDir, 'icon-192.png'));
	await icon(512, path.join(outDir, 'icon-512.png'));
	await icon(180, path.join(root, 'public', 'apple-touch-icon.png'), 0.16);
	await icon(512, path.join(outDir, 'icon-maskable-512.png'), 0.22);
	await icon(32, path.join(root, 'public', 'favicon.png'), 0.14);
	await icon(48, path.join(root, 'public', 'favicon-ipb.png'), 0.14);

	await sharp(path.join(root, 'public', 'favicon.png')).resize(32, 32).toFile(path.join(root, 'public', 'favicon.ico'));

	console.log('Ícones PWA e favicon gerados em public/icons/ e public/');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
