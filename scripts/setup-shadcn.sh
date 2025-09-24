#!/usr/bin/env bash

# Fetch shadcn components defined in ./scripts/shadcn-components.txt
set -euo pipefail
while read -r component; do
  [ -z "$component" ] && continue
  pnpm dlx shadcn@latest add "$component"
done < "$(dirname "$0")/shadcn-components.txt"