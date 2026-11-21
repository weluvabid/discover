#!/usr/bin/env bash

set -euo pipefail

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
  tooltip \
  @reui/c-dialog-3 \
  @reui/c-popover-10 \
  @reui/c-empty-2 \
  @reui/c-empty-11 \
  @reui/c-command-7 \
  @reui/c-tabs-9 \
  @reui/c-avatar-24
