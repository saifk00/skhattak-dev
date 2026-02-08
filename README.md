# skhattak.dev

Personal site built with [Astro](https://astro.build/). Markdown blog posts
with optional interactive components (React, WebGL, WASM).

## Setup

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # production build → dist/
```

## Writing posts

Each post lives in `src/content/posts/<slug>/`. At minimum, a post needs an
`index.mdx` file with frontmatter:

```mdx
---
title: "My Post Title"
subtitle: "Optional subtitle"        # optional
date: 2026-02-07
tags: ["rust", "compilers"]          # optional
draft: false                         # optional, default false
---

Your markdown content here...
```

### Adding images

Drop images in the post directory and reference them:

```mdx
![alt text](./my-image.png)
```

### Adding interactive components

Create a `.tsx` file in the post directory (or in `src/components/` if shared):

```mdx
import MyDemo from './MyDemo.tsx';

Some explanation text...

<MyDemo client:visible />

More text after the demo...
```

Hydration directives:
- `client:load` — hydrate immediately
- `client:idle` — hydrate when browser is idle
- `client:visible` — hydrate when scrolled into view (best for demos)
- `client:only="react"` — pure client-side, no SSR (use for WebGL/canvas)

### Publishing from anywhere

```bash
./publish.sh ~/projects/my-project/writeup/ my-post-slug
```

This copies the directory into the site, commits, and pushes.

## Deploy

Connected to Cloudflare Pages. Push to `main` → auto-deploy.

- Build command: `npm run build`
- Output directory: `dist`
