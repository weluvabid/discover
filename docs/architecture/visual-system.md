# Discover visual system

Discover follows the neutral theme foundation established by Iris and PixelFlow.
The React application uses the same Atkinson Hyperlegible font files already bundled
with the project and mirrors Iris's semantic theme tokens so the UI remains compatible
with the installed Base UI / shadcn component layer.

## Ownership

- Iris is the reference for typography, neutral semantic colours, radii and shadows.
- Discover owns product-specific tokens and application composition.
- `--roblox-blue` is reserved for Roblox launch actions; ordinary navigation,
  selection, ranking metadata, badges and focus states remain monochrome.
- Experience artwork retains its original colours and is not globally desaturated
  or tinted by the design system.
- ReUI / Base UI components own generic interaction and accessibility behaviour.
  Feature styles may customize their appearance through semantic tokens.

## Theme tokens

The neutral light and dark palettes mirror `@weluvabid/iris`'s `src/styles/theme.css`.
Discover defaults to dark mode. The existing bundled Atkinson Hyperlegible Regular
and Bold assets are retained to avoid duplicating font payloads.

If Iris changes its public theme contract, update `src/styles/foundation.css` from
the upstream Iris theme and review the Discover-specific overrides in
`src/styles/discover-theme.css`.
