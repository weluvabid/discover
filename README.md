# Discover

A Roblox-inspired experience discovery prototype exploring personalized discovery, search, ranking, and explainable recommendations.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- Lucide React
- Vitest + Testing Library
- pnpm 12

## Requirements

- Node.js `26.13.0` (see `.node-version`)
- pnpm `12.0.0` (see `packageManager` in `package.json`)

## Development

```sh
pnpm install
pnpm dev
```

## Architecture

The application is organized around feature ownership rather than a single global component or stylesheet:

- `app/` owns the application composition.
- `components/layout/`, `components/discovery/`, `components/experience/`, and `components/pages/` contain focused presentation components.
- `features/search/` owns search hooks and pure search/filter functions.
- `features/discovery/engine/` contains the framework-independent ranking model and algorithms.
- `features/discovery/hooks/` owns discovery-page state and orchestration.
- `data/mocks/experiences.ts` contains catalog records; `data/mocks/catalog.ts` contains derived catalog collections and lookup helpers.
- Component-owned styles live beside their component areas. `styles/index.css` preserves the cascade order and imports the small global foundation plus those feature styles.

## Quality checks

```sh
pnpm check
```

This runs TypeScript, ESLint, Prettier, Vitest, and the production build.
