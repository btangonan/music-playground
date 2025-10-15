#!/bin/bash
set -e

echo "=== Post-Merge Verification Script ==="
echo ""

echo "Checking vendor cleanup…"
if git ls-files "_vendor/*" | grep .; then
  echo "❌ _vendor still present" && exit 1
else
  echo "✅ no _vendor"
fi

echo ""
echo "Building engine…"
pnpm -w -F @music/engine build

echo ""
echo "Building composer…"
pnpm -w -F composer build

echo ""
echo "Running tests…"
pnpm test

echo ""
echo "Sanity check: Tone version alignment"
echo -n "Engine (peer): "
jq -r '.peerDependencies.tone // empty' packages/engine/package.json
echo -n "Composer: "
jq -r '.dependencies.tone' apps/composer/package.json
echo -n "Lab: "
jq -r '.dependencies.tone' apps/lab/package.json

echo ""
echo "✅ All verification checks passed!"
echo ""
echo "Next: pnpm -w -F composer dev"
echo "Then manually verify:"
echo "  - Click Play → first sound under 2.5s"
echo "  - Move Space/Color/Hype → audible changes"
echo "  - Toggle grid steps → no clipping"
