# IPB Med — Letras

Aplicação web **mobile-first** com letras de músicas da Igreja Presbiteriana de Medianeira (IPB Med).

- Conteúdo em **Markdown** (um arquivo por música)
- Site estático com [Astro](https://astro.build)
- Hospedagem no **GitHub Pages**

## Desenvolvimento local

Requisitos: Node.js 22.12+.

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

## Adicionar uma música

Crie um arquivo em `src/content/songs/` com o nome em slug, por exemplo `como-e-grande-o-meu-deus.md`:

```markdown
---
title: "Como é Grande o Meu Deus"
number: 42
tags: ["adoração", "louvor"]
links:
  - label: "YouTube"
    url: "https://www.youtube.com/watch?v=..."
  - label: "Cifra"
    url: "https://..."
---

Estrofe 1
Linha da letra...

Refrão
Linha do refrão...
```

Campos do frontmatter:

| Campo    | Obrigatório | Descrição                                      |
|----------|-------------|------------------------------------------------|
| `title`  | sim         | Título da música                               |
| `number` | não         | Número do hinário / ordem                      |
| `tags`   | não         | Lista de tags para busca                       |
| `links`  | não         | Lista de `{ label, url }` (YouTube, cifra…)    |

O nome do arquivo vira a URL: `como-e-grande-o-meu-deus.md` → `/musica/como-e-grande-o-meu-deus/`.

Depois, faça commit e push para `main`. O GitHub Actions publica automaticamente.

## Deploy no GitHub Pages

1. Ajuste em `astro.config.mjs`:
   - `site`: `https://SEU-USUARIO.github.io`
   - `base`: `/ipbsong` (nome do repositório; use `/` se o repo for `usuario.github.io`)
2. No GitHub: **Settings → Pages → Source → GitHub Actions**
3. Faça push na branch `main` (ou rode o workflow manualmente em **Actions**)

O site ficará em `https://SEU-USUARIO.github.io/ipbsong/`.
