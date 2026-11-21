# Discover

A Roblox-inspired experience discovery prototype exploring personalized discovery, search, ranking, and explainable recommendations.

## Stack

- Astro 7 + React 19 + TypeScript
- Tailwind CSS 4
- ReUI (Base UI + Maia)
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

## Discovery architecture

Explore is powered by one shared, explainable ranking engine with five separate contexts: Featured, Trending, Recommended, Hidden Gems, and Recently Launched. Context eligibility is evaluated before ranking; user preferences affect ordering within eligible candidate pools. Ranked results expose weighted signal contributions and any diversity reranking adjustment through the **Why this result?** popover.

Astro filesystem routes provide `/`, `/trending`, `/hidden-gems`, `/collections`, `/library`, and `/search`. Genre filters are reflected in the URL and constrain every Explore context. See [the ranking architecture](docs/architecture/discovery-ranking.md) for eligibility rules, scoring, explainability, and the mock-data boundary.

## Frontend platform

Discover uses Astro for filesystem routing and document composition, with the interactive discovery application hydrated as a single React island. ReUI is the primary component ecosystem using the Base UI + Maia style. Shared primitives and selected ReUI compositions are integrated across discovery controls, ranking explanations, experience details, filters, navigation actions, and empty states. See [the frontend migration notes](docs/architecture/frontend-migration.md) for component ownership and setup.
