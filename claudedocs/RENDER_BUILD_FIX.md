# Render Build Fix

## Problem

Build fails because `pnpm -w -F composer build` triggers turbo which tries to build ALL packages including the broken API.

## Solution

**Change build command in Render settings to:**

```bash
cd apps/composer && pnpm install && pnpm build
```

This builds ONLY the composer app, skipping API/engine/lab.

## Steps

1. Go to: https://dashboard.render.com/static/srv-d3t8ce9bh1hs73a9ob1g/settings
2. Find "Build Command"
3. Change from: `pnpm install && pnpm -w -F composer build`
4. Change to: `cd apps/composer && pnpm install && pnpm build`
5. Click "Save Changes"
6. Trigger manual deploy

## Why This Works

- `cd apps/composer` - Go directly to composer app
- `pnpm install` - Install deps (includes workspace deps via symlinks)
- `pnpm build` - Run vite build (doesn't trigger turbo)

This bypasses turbo workspace orchestration entirely.
