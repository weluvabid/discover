#!/usr/bin/env sh
set -eu

# ReUI is a shadcn-compatible source registry, not an npm runtime package.
# components.json selects the Base UI + Maia design system.
pnpm dlx shadcn@latest add --overwrite \
  @reui/button \
  @reui/badge \
  @reui/dialog \
  @reui/input \
  @reui/popover \
  @reui/scroll-area \
  @reui/select \
  @reui/separator \
  @reui/slider \
  @reui/switch \
  @reui/tooltip
