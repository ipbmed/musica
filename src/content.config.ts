import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const songs = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/songs' }),
	schema: z
		.object({
			title: z.string(),
			kind: z.enum(['hino', 'cantico']),
			number: z.number().int().min(1).max(999).optional(),
			artist: z.string().optional(),
			tags: z.array(z.string()).default([]),
			links: z
				.array(
					z.object({
						label: z.string(),
						url: z.string().url(),
					}),
				)
				.default([]),
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
		}),
});

export const collections = { songs };
