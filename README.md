# IPB Med — Música

Aplicação web **mobile-first** com músicas da Igreja Presbiteriana de Medianeira (IPB Med).

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

## Logo e foto da igreja

Substitua os arquivos em `public/`:

| Arquivo | Uso |
|---------|-----|
| `public/logo.png` | Logo IPB (sarça) no cabeçalho e rodapé |
| `public/images/logo-ipb.png` | Original baixada (fundo preto) |
| `public/images/igreja.jpg` | Foto em destaque na home (largura total) |

A logo oficial veio com fundo preto; o site usa `logo.png` com fundo transparente. Prefira foto horizontal (~1600×900) e, se possível, comprimida para web.

## Hinos e cânticos

- **Hinos:** Novo Cântico, numerados de 1 a 400 (`kind: hino` + `number`)
- **Cânticos:** demais músicas (`kind: cantico`; número opcional)

Na home dá para filtrar por Todos / Hinos / Cânticos e ordenar por número ou título.

### Extrair hinos do Novo Cântico

1. Baixe o PDF para `tmp/novo_cantico.pdf`  
   Fonte: https://novocantico.com.br/novo_cantico.pdf
2. Rode:

```bash
npm run extract:hinos
```

Isso gera `src/content/songs/hino-XXX-....md`. O hino **378** não está neste PDF.

### Extrair cânticos da pasta IPB Medianeira

1. Coloque o PDF em `tmp/Pasta de canticos IPB Medianeira.pdf`
2. Rode:

```bash
npm run extract:canticos
```

Isso gera `src/content/songs/cantico-XXX-....md` (90 cânticos, numerados a partir de **401**).

A extração separa **estrofes** pelo espaçamento vertical do PDF e marca **Refrão** quando o mesmo bloco se repete no início ou no fim das estrofes.

Os direitos do Hinário Novo Cântico são da editora Cultura Cristã; use apenas no contexto autorizado da igreja.

## Adicionar uma música

Crie um arquivo em `src/content/songs/` com o nome em slug, por exemplo `como-e-grande-o-meu-deus.md`:

```markdown
---
title: "Como é Grande o Meu Deus"
kind: cantico
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

Exemplo de hino:

```markdown
---
title: "Doxologia"
kind: hino
number: 1
tags: ["novo-cantico"]
links: []
---

Justo é o Senhor...
```

Campos do frontmatter:

| Campo    | Obrigatório | Descrição                                      |
|----------|-------------|------------------------------------------------|
| `title`  | sim         | Título da música                               |
| `kind`   | sim         | `hino` ou `cantico`                            |
| `number` | hinos: sim  | Hinos 1–400; cânticos a partir de 401          |
| `artist` | não         | Artista / compositor                           |
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
