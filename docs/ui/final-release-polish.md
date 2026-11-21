# Final release polish

## Persona selection

The Explore play-style control now displays one avatar for the active persona. Activating it opens a searchable command palette containing all personas and the unpersonalized `All play styles` option. Selecting an option updates the existing persona state, so the current URL persistence and ranking flow remain unchanged.

The palette also summarizes the two ranking corrections already in this baseline: diversity strength follows its configured slider, and relevance no longer rewards description length.

The ReUI installer includes `@reui/c-command-8`. The application composition uses the project's existing shadcn command, dialog, avatar, and tooltip primitives so the selector does not depend on a registry fetch at runtime.

## Context-specific ranking labels

The featured card and discovery sections now label the displayed score by ranking context (`FEATURED SCORE`, `TRENDING SCORE`, `RECOMMENDED SCORE`, `HIDDEN GEMS SCORE`, or `RECENTLY LAUNCHED SCORE`). Scores and ranking calculations are unchanged.

## Lighthouse fixes

- The Roblox blue token is darkened to `#0057e7`, giving white button content a contrast ratio of approximately 5.97:1.
- The featured `Read more` link retains its visible wording and includes a visually hidden experience-specific phrase in its link text, making the destination descriptive to assistive technology and link auditing tools.

## Verification performed for this patch

- TypeScript TSX transpilation passed for all changed TSX/TS files.
- `bash -n scripts/install-reui.sh` passed.
- The white-on-Roblox-blue contrast ratio was calculated as approximately 5.97:1.
- Full project tests, Astro check/build, lint, and Lighthouse were not run in this environment because project dependencies are not installed and the required Node 26 / pnpm 12 toolchain is unavailable.
