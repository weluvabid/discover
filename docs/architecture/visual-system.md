# Discover visual system

Discover uses Iris as its typography and neutral-theme reference, Tailwind CSS 4
for component composition, and the installed ReUI/Base UI components for shared
interaction primitives.

## Ownership

- Iris owns the typography and semantic light/dark colour foundations.
- Discover owns product-specific semantic tokens, including `--roblox-blue`, which
  is reserved for Roblox launch actions.
- Tailwind utilities own component layout, spacing, sizing, responsive behaviour,
  and state styling.
- ReUI/Base UI owns generic controls, interaction behaviour, positioning,
  focus management, and accessibility primitives.
- Discover React components own product-specific compositions and data presentation.
- Experience artwork retains its original colours.

## CSS policy

`src/styles/foundation.css` is the only application-authored stylesheet. It is
limited to font-face declarations, Tailwind theme integration, semantic theme
variables, document defaults, and the product-specific Roblox action token.

Do not add component or feature stylesheets. Do not add authored CSS margin or
padding declarations, pixel-based spacing declarations, or bespoke responsive
layout rules. Express those concerns with Tailwind utilities in the component.
Use the existing ReUI components rather than rebuilding generic controls.

Dynamic values that are data rather than layout (for example, a ranking signal
bar width) may remain inline styles. They must not be used to implement spacing
or component layout.

## Theme tokens

The neutral light and dark palettes mirror `@weluvabid/iris`'s public theme
contract. Discover defaults to dark mode. The bundled Atkinson Hyperlegible
Regular and Bold assets are retained to avoid duplicate font payloads.

When Iris changes its theme contract, update `src/styles/foundation.css` from the
upstream Iris theme and review only Discover-specific semantic tokens.
