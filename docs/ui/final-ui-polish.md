# Final UI polish

This patch consolidates the final discovery UI refinements on top of the uploaded project archive.

## Changes

- Replaced the labeled play-style control with the ReUI avatar-fan pattern, using deterministic DiceBear avatars. The selected persona is moved to the first position and remains keyboard-selectable.
- Removed the redundant Explore eyebrow and Play style label; the selected persona context remains in the Explore description.
- Added a restrained spectral glow to Tune Discovery.
- Reduced search-input typography, made sort labels use presentation labels, and moved the matching-result count into the Search results heading.
- Hid the duplicate Search results section heading.
- Prevented empty artwork URLs from being rendered as `img[src=""]`; missing artwork uses the existing fallback.
- Added compact mobile genre controls and a visible selected state; replaced the mobile Featured Spotlight text badge with an icon.
- Added semantic colors for rating stars, saved states, trend movement, and rank-score bands.
- Replaced per-signal progress bars with a segmented effective-weight bar and per-signal calculation popovers.
- Kept the featured description clamped to three lines with Read more positioned at its trailing edge.
- Preserved the existing game-detail application shell, Astro ClientRouter transitions, and Safari `html`/`body` scrolling contract. The redundant View on Roblox link was already absent in the uploaded baseline.

## Verification

- TypeScript/TSX syntax transpilation: passed for 101 files.
- `bash -n scripts/install-reui.sh`: passed.
- `git diff --check`: passed.
- `git apply --check` against a clean extraction of the uploaded archive: passed.
- The full Vitest, Astro check/build, lint, and production build were not run because the available environment has Node 22 and no installed project dependencies; the project requires Node 26 and pnpm 12.
