# Repository Guidelines

## Project Structure & Module Organization
- `src/pages/` contains route files (`index.astro`, `posts/index.astro`, `posts/[slug].astro`).
- `src/layouts/` defines shared page shells (`Base.astro`, `Post.astro`).
- `src/components/` holds reusable interactive React components (for MDX embeds).
- `src/content/posts/<slug>/index.mdx` is the source of each blog post; keep post-local images/assets in the same slug folder.
- `src/content.config.ts` defines the post schema and required frontmatter.
- `public/` is for static assets; `dist/` is generated output (do not edit by hand).

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start Astro dev server at `http://localhost:4321`.
- `npm run build`: create production build in `dist/`.
- `npm run preview`: preview the built site locally.
- `./publish.sh <source-dir> <post-slug>`: sync an external post directory into `src/content/posts/<slug>/`, then commit and push.

Run `npm run build` before opening a PR to catch schema, MDX, and route issues.

## Coding Style & Naming Conventions
- Use 2-space indentation and keep existing Astro/TSX style consistent.
- Use `PascalCase` for component/layout filenames (`CacheCalculator.tsx`, `Post.astro`).
- Keep route filenames framework-conventional (`[slug].astro` for dynamic routes).
- Use lowercase kebab-case for post slugs (`psp-neural-networks`).
- Frontmatter should match `src/content.config.ts`: `title`, optional `subtitle`, `date`, optional `tags`, optional `draft`.

## Testing Guidelines
- There is no dedicated automated test suite yet.
- Minimum validation for every change:
  - `npm run build`
  - `npm run preview` (smoke-check pages and post navigation)
- For interactive components, verify hydration behavior in-browser (prefer `client:visible` unless immediate hydration is required).

## Commit & Pull Request Guidelines
- This repository currently has no established commit history; use Conventional Commit style going forward (`feat:`, `fix:`, `docs:`, `chore:`).
- Keep commits focused and descriptive (example: `feat(posts): add cache geometry demo`).
- PRs should include:
  - a short summary of user-visible changes,
  - verification steps/commands run,
  - screenshots for visual/layout updates,
  - linked issue/task when applicable.
