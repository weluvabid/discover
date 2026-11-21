
#!/usr/bin/env bash

set -euo pipefail

# Install the standard shadcn primitives used by Discover.
pnpm dlx shadcn@latest add \
  button \
  badge \
  dialog \
  input \
  popover \
  scroll-area \
  select \
  separator \
  slider \
  switch \
  tooltip
