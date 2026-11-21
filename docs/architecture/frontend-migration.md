# Frontend platform migration

## Runtime

- Astro owns URL routing and document composition.
- React 19 is hydrated as a single application island for the interactive discovery experience.
- React Router was removed; route navigation uses Astro document routes and browser history for in-page query/filter updates.
- Tailwind CSS 4 remains the styling engine.
- The existing ranking engine, domain types, mock catalog, and tests remain framework-independent.

## Rendering model

The current build uses Astro static output because the catalog and ranking data are still local prototype data. This keeps the deployment static while establishing Astro's route and island boundaries. When the persistent backend is introduced, switch to an on-demand output mode and add the deployment adapter selected for the hosting target. Do not add an adapter before the hosting target is selected.

The Explore application is intentionally one `client:load` React island. Its controls, route-local state, ranking configuration, and result popovers coordinate closely; splitting them into independent islands would add synchronization overhead without reducing meaningful client work.

## ReUI

`components.json` is configured for the ReUI `base-maia` style (Base UI primitives with the Maia visual system). ReUI is a shadcn-compatible source registry, not an npm runtime package. Run `pnpm install:reui` in a network-enabled environment to copy the selected primitives into `src/components/ui`.

ReUI registry documentation: https://reui.io/docs/get-started

The current environment has no network access and does not have pnpm installed, so registry source installation and lockfile regeneration could not be performed here. The existing pnpm lockfile therefore still describes the pre-Astro dependency graph; run `pnpm install` and commit the regenerated lockfile before using the CI workflow, which intentionally keeps frozen-lockfile installs. Existing app controls are retained until the ReUI registry source is installed; do not claim the visual conversion is complete until the remaining custom controls have been migrated and the rendered UI reviewed.

## Next migration checkpoint

1. Run `pnpm install` to resolve Astro and React integration dependencies and regenerate `pnpm-lock.yaml`.
2. Run `pnpm install:reui` to copy the ReUI Base UI primitives.
3. Replace remaining bespoke controls with the copied ReUI components, preserving the existing application behaviour.
4. Review the ReUI default rendering before changing font sizes, line heights, or spacing tokens.
