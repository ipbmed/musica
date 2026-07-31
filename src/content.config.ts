import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const songs = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/songs' }),
	schema: z.object({
		title: z.string(),
		number: z.number().int().positive().optional(),
		tags: z.array(z.string()).default([]),
		links: z
			.array(
				z.object({
					label: z.string(),
					url: z.string().url(),
				}),
			)
			.default([]),
	}),
});

export const collections = { songs };
