# Static-Only Deployment to Render

**Simplified deployment with GitHub Gists sharing (no backend/database)**

---

## ✅ What's Included

- ✅ Full Music Playground composer app
- ✅ Loop sharing via GitHub Gists (free forever)
- ✅ Import shared loops from URL
- ✅ Zero backend - just static hosting
- ✅ $0/month cost

---

## 🚀 Deploy to Render

### Option 1: Dashboard (Recommended for First Time)

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com/static/new

2. **Connect Repository**
   - Connect your GitHub account
   - Select `music-playground` repository
   - Branch: `main`

3. **Configure Build**
   - **Name:** `music-playground-composer`
   - **Build Command:** `pnpm install && pnpm -w -F composer build`
   - **Publish Directory:** `apps/composer/dist`
   - **Auto-Deploy:** Yes

4. **Environment Variables** (Optional)
   - None required! App works without any env vars

5. **Click "Create Static Site"**
   - Wait 2-3 minutes for first deploy
   - Your app will be live at `https://music-playground-composer.onrender.com`

---

### Option 2: Render MCP (Automated)

```typescript
// Use Render MCP from Claude Code
await mcp__render__create_static_site({
  name: "music-playground-composer",
  repo: "https://github.com/YOUR_USERNAME/music-playground",
  branch: "main",
  buildCommand: "pnpm install && pnpm -w -F composer build",
  publishPath: "apps/composer/dist",
  envVars: [] // No env vars needed!
})
```

---

### Option 3: render.yaml Blueprint

**Create `render-static.yaml` in project root:**

```yaml
services:
  - type: web
    name: music-playground-composer
    runtime: static
    buildCommand: pnpm install && pnpm -w -F composer build
    staticPublishPath: apps/composer/dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

Then:
```bash
git add render-static.yaml
git commit -m "Add Render static site blueprint"
git push

# Render auto-detects and deploys
```

---

## 🧪 Testing Locally

```bash
# Build
pnpm -w -F composer build

# Preview production build
pnpm -w -F composer preview

# Open http://localhost:4173
```

---

## 🔗 How Sharing Works

1. **User creates loop** in composer
2. **Clicks "Share" button**
3. **Frontend creates GitHub Gist** (via api.github.com/gists)
4. **Returns shareable URL:** `https://yourapp.com?gist=abc123`
5. **Recipient opens URL** → Loop automatically loads

**No backend. No database. Just GitHub's free API.**

---

## 📊 Bundle Size

- **Current:** 176 KB brotlied
- **Limit:** 180 KB
- **Status:** ✅ Under budget

---

## 🔄 Continuous Deployment

- **Auto-deploy on push:** Every `git push` to `main` triggers rebuild
- **Build time:** ~2-3 minutes
- **Downtime:** Zero (atomic deploys)

---

## 🐛 Troubleshooting

### Issue: Build fails with "Cannot find module '@music/types'"

**Fix:** Workspace dependencies not installed

```bash
# Ensure root deps installed first
buildCommand: "pnpm install --frozen-lockfile && pnpm -w -F composer build"
```

---

### Issue: 404 on routes (e.g., /share, /loop/123)

**Fix:** Add rewrite rules for SPA routing

In Render dashboard:
- Settings → Redirects/Rewrites
- Add: `/* → /index.html (rewrite)`

---

### Issue: Share button not visible

**Cause:** Loop not saved yet (Share button only shows after saving)

**Fix:** Click "Save" first, then "Share" button appears

---

## ⚡ Performance

### CDN & Caching
- ✅ Render serves static assets via global CDN
- ✅ Automatic Brotli/Gzip compression
- ✅ Cache headers set automatically

### Cold Starts
- ✅ No cold starts (static sites are always warm!)
- ✅ Fast initial load (~1-2 seconds globally)

---

## 💰 Cost

**Total: $0/month**

- Static hosting: Free forever on Render
- GitHub Gists: Free (rate limit: 60 requests/hour unauthenticated)
- No database
- No backend server

---

## 🔐 Security

### What's Secure
- ✅ HTTPS by default (Render provides SSL)
- ✅ No secrets stored (no env vars needed)
- ✅ No server-side code (can't be hacked)
- ✅ Public gists only (no private data risk)

### Rate Limits
- **GitHub Gists API:** 60 requests/hour per IP (unauthenticated)
- **After limit:** User sees friendly error "Rate limit exceeded, try again in X minutes"

---

## 🔧 Advanced Configuration

### Custom Domain

1. Go to Render dashboard
2. Settings → Custom Domain
3. Add your domain (e.g., `music.yourdomain.com`)
4. Update DNS: Add CNAME → `music-playground-composer.onrender.com`

### Environment Variables (Future)

If you later add analytics or other services:

```bash
# In Render dashboard:
VITE_ANALYTICS_ID=xxx
VITE_SENTRY_DSN=xxx
```

---

## 📈 Monitoring

### Render Dashboard Provides:
- Deploy history & logs
- Build success/failure status
- Traffic metrics (if on paid tier)

### External Monitoring (Optional):
- **UptimeRobot:** Free tier monitors uptime
- **Google Analytics:** Add to index.html for usage tracking
- **Sentry:** Frontend error tracking

---

## 🚀 Next Steps

After basic deployment works:

1. **Custom domain:** Point your domain to Render
2. **Analytics:** Add Google Analytics or Plausible
3. **Error tracking:** Set up Sentry for bug reports
4. **SEO:** Add meta tags for social sharing
5. **PWA:** Make it installable (add manifest.json)

---

## 🆙 Upgrade Path

If you later need backend features:

1. **Keep static site** for composer frontend
2. **Add separate backend** (see RENDER_DEPLOYMENT_GUIDE.md)
3. **Keep gist sharing** working (backward compatible)
4. **Add database-backed features** incrementally

---

## 📚 Files Reference

**Implementation files:**
- `apps/composer/src/services/sharing.ts` - GitHub Gists API client
- `apps/composer/src/components/ShareButton.tsx` - Share UI component
- `apps/composer/src/hooks/useGistImport.ts` - URL param import hook

**Documentation:**
- `claudedocs/LEAN_SHARING_OPTIONS.md` - Sharing architecture comparison
- `claudedocs/RENDER_DEPLOYMENT_GUIDE.md` - Full backend deployment (alternative)

---

**Last Updated:** 2025-10-23
**Status:** ✅ Ready to deploy
