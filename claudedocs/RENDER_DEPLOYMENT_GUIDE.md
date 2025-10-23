# Render Deployment Guide - Music Playground

## Prerequisites

- GitHub repository with latest code pushed
- Render account (free tier works)
- Access to Render MCP tools (already connected)

---

## Architecture

```
PostgreSQL (Render) → API (Web Service) → Composer (Static Site)
```

---

## Step-by-Step Deployment

### 1️⃣ Create PostgreSQL Database

**Manual (Dashboard):**
1. Go to https://dashboard.render.com/new/database
2. Name: `music-playground-db`
3. Plan: `free` (or `starter` for production)
4. Region: `oregon` (or closest to users)
5. Click "Create Database"
6. Copy **Internal Database URL** (starts with `postgresql://`)

**Automated (MCP):**
```typescript
mcp__render__create_postgres({
  name: "music-playground-db",
  plan: "free",
  region: "oregon"
})
```

**Important:** Save the `DATABASE_URL` - you'll need it for the API service.

---

### 2️⃣ Create API Backend (Web Service)

**Build Configuration:**
- **Build Command:** `cd apps/api && pnpm install && pnpm build`
- **Start Command:** `cd apps/api && pnpm db:migrate && pnpm start`
- **Runtime:** Node.js
- **Plan:** `starter` (free tier)

**Environment Variables:**
```bash
DATABASE_URL=<from PostgreSQL service above>
JWT_SECRET=<generate 32+ char random string>
JWT_EXPIRES_IN=7d
NODE_ENV=production
CORS_ORIGIN=<your-composer-static-site-url>
SERVER_PORT=3001
```

**Manual (Dashboard):**
1. Go to https://dashboard.render.com/web/new
2. Connect your GitHub repository
3. Name: `music-playground-api`
4. Branch: `main`
5. Runtime: `Node`
6. Build Command: `cd apps/api && pnpm install && pnpm build`
7. Start Command: `cd apps/api && pnpm db:migrate && pnpm start`
8. Add environment variables listed above
9. Click "Create Web Service"

**Automated (MCP):**
```typescript
mcp__render__create_web_service({
  name: "music-playground-api",
  repo: "https://github.com/YOUR_USERNAME/music-playground",
  branch: "main",
  runtime: "node",
  buildCommand: "cd apps/api && pnpm install && pnpm build",
  startCommand: "cd apps/api && pnpm db:migrate && pnpm start",
  plan: "starter",
  region: "oregon",
  envVars: [
    { key: "DATABASE_URL", value: "<from-postgres>" },
    { key: "JWT_SECRET", value: "<generate-secure-value>" },
    { key: "JWT_EXPIRES_IN", value: "7d" },
    { key: "NODE_ENV", value: "production" },
    { key: "CORS_ORIGIN", value: "<your-static-site-url>" },
    { key: "SERVER_PORT", value: "3001" }
  ]
})
```

**After deployment:** Copy the API URL (e.g., `https://music-playground-api.onrender.com`)

---

### 3️⃣ Create Composer Frontend (Static Site)

**Build Configuration:**
- **Build Command:** `pnpm install && pnpm -w -F composer build`
- **Publish Directory:** `apps/composer/dist`
- **Environment Variable:** `VITE_API_URL=<your-api-url>/api`

**Manual (Dashboard):**
1. Go to https://dashboard.render.com/static/new
2. Connect your GitHub repository
3. Name: `music-playground-composer`
4. Branch: `main`
5. Build Command: `pnpm install && pnpm -w -F composer build`
6. Publish Directory: `apps/composer/dist`
7. Add environment variable:
   - `VITE_API_URL` = `https://music-playground-api.onrender.com/api`
8. Click "Create Static Site"

**Automated (MCP):**
```typescript
mcp__render__create_static_site({
  name: "music-playground-composer",
  repo: "https://github.com/YOUR_USERNAME/music-playground",
  branch: "main",
  buildCommand: "pnpm install && pnpm -w -F composer build",
  publishPath: "apps/composer/dist",
  envVars: [
    { key: "VITE_API_URL", value: "https://music-playground-api.onrender.com/api" }
  ]
})
```

**After deployment:** Your site will be available at `https://music-playground-composer.onrender.com`

---

### 4️⃣ Update CORS Configuration

Go back to API service environment variables and update:

```bash
CORS_ORIGIN=https://music-playground-composer.onrender.com
```

This allows the frontend to make API requests.

---

## 🔒 Security Checklist

- [ ] Generate strong JWT_SECRET (32+ characters, random)
- [ ] Set CORS_ORIGIN to exact frontend URL (no wildcards in production)
- [ ] Enable DATABASE_SSL=true for Postgres (Render provides this automatically)
- [ ] Use HTTPS URLs for all services (Render provides this automatically)
- [ ] Never commit .env files with secrets to git

**Generate JWT_SECRET:**
```bash
openssl rand -base64 32
```

---

## 🧪 Testing Deployment

1. **Health Check:**
   ```bash
   curl https://music-playground-api.onrender.com/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

2. **Frontend Loads:**
   - Visit `https://music-playground-composer.onrender.com`
   - Check browser console for errors
   - Verify no CORS errors

3. **Authentication Flow:**
   - Try signing up a test user
   - Try logging in
   - Check JWT token in localStorage

4. **Loop Operations:**
   - Create a new loop
   - Save it (POST /api/loops)
   - Load it back (GET /api/loops)
   - Verify it persists in database

---

## ⚡ Performance Considerations

### Free Tier Limitations:
- **API cold starts:** ~30-60 seconds after 15 min inactivity
- **Database:** 256 MB storage, 1 GB RAM
- **Static site:** Global CDN, no cold starts

### Optimization Tips:
1. **Keep API warm:** Use a free uptime monitor (UptimeRobot, Better Stack)
   - Ping `/health` endpoint every 10 minutes

2. **Bundle size:** Already enforced at 150 KB (good!)

3. **Database indexing:** Add indexes to frequently queried columns:
   ```sql
   CREATE INDEX idx_loops_user_id ON loops(user_id);
   CREATE INDEX idx_loops_created_at ON loops(created_at);
   ```

---

## 🐛 Common Issues

### Issue: "Cannot find module '@music/types'"

**Cause:** Monorepo workspace dependencies not resolved

**Fix:** Update build command to install from root:
```bash
pnpm install --frozen-lockfile && pnpm -w -F api build
```

---

### Issue: API returns 500 on startup

**Cause:** Database migration failed

**Fix:** Check logs for migration errors. May need to:
1. Manually run migrations: `pnpm db:migrate`
2. Verify DATABASE_URL is correct
3. Check PostgreSQL connection from API service

---

### Issue: CORS errors in browser

**Cause:** CORS_ORIGIN mismatch

**Fix:** Ensure CORS_ORIGIN exactly matches frontend URL (no trailing slash)

---

### Issue: First sound takes >10 seconds

**Cause:** API cold start + audio context initialization

**Fix:**
1. Keep API warm with uptime monitor
2. Frontend shows loading state during cold start
3. Consider upgrading to paid tier ($7/mo) for instant starts

---

## 🔄 Continuous Deployment

**Auto-deploy on push:**
- Render watches your GitHub branch
- Any push to `main` triggers rebuild
- **Important:** This means broken code goes live immediately

**Recommended workflow:**
1. Develop on feature branches
2. Test locally thoroughly
3. Merge to `main` only after testing
4. Or use `production` branch for Render, keep `main` for development

---

## 📊 Monitoring

**Render Dashboard provides:**
- Deploy logs
- Runtime logs
- Metrics (CPU, memory, requests)
- Health check status

**External monitoring (recommended):**
- **UptimeRobot:** Ping `/health` endpoint
- **Sentry:** Frontend error tracking
- **LogRocket:** Session replay for debugging

---

## 💰 Cost Estimates

### Free Tier (All services free):
- ✅ PostgreSQL: 256 MB storage
- ✅ API: Starter (cold starts after 15 min)
- ✅ Static Site: Unlimited bandwidth

**Total: $0/month**

### Paid Tier (No cold starts):
- PostgreSQL Basic: $7/month (1 GB storage)
- API Standard: $7/month (instant starts)
- Static Site: Free (always free)

**Total: $14/month**

---

## 🚀 Next Steps

After basic deployment works:

1. **Add custom domain:** Configure DNS in Render dashboard
2. **Set up monitoring:** UptimeRobot + Sentry
3. **Database backups:** Render auto-backs up paid tiers
4. **CI/CD improvements:** Add preview environments for PRs
5. **Environment separation:** Create separate staging/production services

---

## 📚 Additional Resources

- [Render Docs: Static Sites](https://render.com/docs/static-sites)
- [Render Docs: Web Services](https://render.com/docs/web-services)
- [Render Docs: PostgreSQL](https://render.com/docs/databases)
- [Render Blueprint Spec](https://render.com/docs/blueprint-spec)

---

## 🤖 Automated Deployment Script

**Using Render MCP (after testing manually):**

Create `scripts/deploy-to-render.ts`:

```typescript
// Deploy all services to Render using MCP
// Run: pnpm tsx scripts/deploy-to-render.ts

const GITHUB_REPO = "https://github.com/YOUR_USERNAME/music-playground"

async function deploy() {
  console.log("🚀 Deploying Music Playground to Render...")

  // 1. Create PostgreSQL
  const db = await mcp__render__create_postgres({
    name: "music-playground-db",
    plan: "free",
    region: "oregon"
  })
  console.log("✅ Database created:", db.id)

  // 2. Create API
  const api = await mcp__render__create_web_service({
    name: "music-playground-api",
    repo: GITHUB_REPO,
    branch: "main",
    runtime: "node",
    buildCommand: "cd apps/api && pnpm install && pnpm build",
    startCommand: "cd apps/api && pnpm db:migrate && pnpm start",
    envVars: [
      { key: "DATABASE_URL", value: db.connectionString },
      { key: "JWT_SECRET", value: generateSecret() },
      { key: "NODE_ENV", value: "production" }
    ]
  })
  console.log("✅ API created:", api.serviceUrl)

  // 3. Create Static Site
  const site = await mcp__render__create_static_site({
    name: "music-playground-composer",
    repo: GITHUB_REPO,
    branch: "main",
    buildCommand: "pnpm install && pnpm -w -F composer build",
    publishPath: "apps/composer/dist",
    envVars: [
      { key: "VITE_API_URL", value: `${api.serviceUrl}/api` }
    ]
  })
  console.log("✅ Static site created:", site.url)

  // 4. Update CORS
  await mcp__render__update_environment_variables({
    serviceId: api.id,
    envVars: [
      { key: "CORS_ORIGIN", value: site.url }
    ]
  })
  console.log("✅ CORS updated")

  console.log("\n🎉 Deployment complete!")
  console.log(`Frontend: ${site.url}`)
  console.log(`API: ${api.serviceUrl}`)
}

function generateSecret() {
  return require('crypto').randomBytes(32).toString('base64')
}

deploy().catch(console.error)
```

---

**Last Updated:** 2025-10-23
