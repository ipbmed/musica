import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const linkSchema = z.object({
	label: z.string(),
	/** URL absoluta (https://…) ou caminho relativo ao site (ex.: files/partitura.pdf). */
	url: z.string().min(1),
});

const versionSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	/** Tom da versão (ex.: G, Am, Bb). */
	key: z.string().optional(),
	/** Andamento em batidas por minuto. */
	bpm: z.number().int().min(30).max(300).optional(),
	/** Roteiro / instruções (estrofes, refrão, mudanças de tom…). */
	instructions: z.array(z.string()).default([]),
	links: z.array(linkSchema).default([]),
	/**
	 * Letra da versão com cifra no formato Cifra Club:
	 * `[G]Grande é o Se[C]nhor`
	 * Instruções embutidas: linha começando com `> ` (ex.: `> Refrão`).
	 */
	lyrics: z.string().min(1),
});

const songs = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/songs' }),
	schema: z
		.object({
			title: z.string(),
			kind: z.enum(['hino', 'cantico']),
			number: z.number().int().min(1).max(999).optional(),
			artist: z.string().optional(),
			tags: z.array(z.string()).default([]),
			links: z.array(linkSchema).default([]),
			/** Versões para o modo músico (cifra, bpm, tom, roteiro). */
			versions: z.array(versionSchema).default([]),
		})
		.superRefine((data, ctx) => {
			if (data.kind === 'hino') {
				if (data.number === undefined) {
					ctx.addIssue({
						code: 'custom',
						message: 'Hinos precisam de number (1–400).',
						path: ['number'],
					});
				} else if (data.number > 400) {
					ctx.addIssue({
						code: 'custom',
						message: 'Hinos usam number de 1 a 400.',
						path: ['number'],
					});
				}
			}

			const ids = new Set<string>();
			for (const [index, version] of data.versions.entries()) {
				if (ids.has(version.id)) {
					ctx.addIssue({
						code: 'custom',
						message: `id de versão duplicado: ${version.id}`,
						path: ['versions', index, 'id'],
					});
				}
				ids.add(version.id);
			}
		}),
});

export const collections = { songs };
