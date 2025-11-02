# Deployment Guide - Cloudflare Pages

**Quick deployment guide for publishing the roguelike game to Cloudflare Pages**

---

## Prerequisites

- **Node.js** installed (already have this)
- **Git** repository (already have this)
- **Cloudflare account** (free) - Sign up at https://dash.cloudflare.com/sign-up

---

## One-Time Setup

### 1. Create Cloudflare Account

If you don't have one already:
1. Go to https://dash.cloudflare.com/sign-up
2. Sign up with email (free tier is perfect)
3. Verify your email address

### 2. Authenticate Wrangler

Run this command to connect Wrangler to your Cloudflare account:

```bash
npx wrangler login
```

This will:
- Open your browser
- Ask you to log in to Cloudflare
- Grant Wrangler permission to deploy
- Save authentication tokens locally

**Note**: You only need to do this once per machine.

---

## Deploying Your Game

### Method 1: Quick Deploy (Recommended)

**Deploy to production**:
```bash
npm run deploy
```

This will:
1. Build your game (`npm run build`)
2. Deploy the `dist/` folder to Cloudflare Pages
3. Give you a live URL like `https://roguelike.pages.dev`

**First deployment** will ask you to:
- Create a new project (press Enter to confirm "roguelike")
- Choose production branch (use "main" or press Enter)

### Method 2: Preview Deployment

Test your changes before going live:
```bash
npm run deploy:preview
```

This creates a preview URL like `https://preview.roguelike.pages.dev` that won't affect your production site.

### Method 3: Explicit Production Deployment

```bash
npm run deploy:production
```

Explicitly deploys to production branch.

---

## After First Deployment

### Your Live URLs

After deploying, you'll see output like:

```
✨ Success! Uploaded 15 files (3.45 sec)

✨ Deployment complete! Take a peek over at https://abc123.roguelike.pages.dev
```

You'll have:
- **Production**: `https://roguelike.pages.dev`
- **Preview**: `https://[branch].roguelike.pages.dev` (for preview deployments)

### Custom Domain (Optional)

To use your own domain like `roguelike.yourname.com`:

1. Go to https://dash.cloudflare.com/
2. Click "Workers & Pages" → "roguelike"
3. Go to "Custom domains" tab
4. Click "Set up a custom domain"
5. Follow the instructions to:
   - Add your domain
   - Update DNS records (automatic if using Cloudflare DNS)
   - SSL will be configured automatically

---

## Git Integration (Automatic Deployments)

**Want automatic deployments on every git push?**

### Setup via Cloudflare Dashboard

1. Go to https://dash.cloudflare.com/
2. Click "Workers & Pages"
3. Click "Create application" → "Pages" → "Connect to Git"
4. Connect your GitHub repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave empty)
6. Click "Save and Deploy"

Now every time you push to GitHub:
- Cloudflare automatically builds and deploys
- Preview deployments for pull requests
- Production deployment for main branch

---

## Deployment Workflow

### Option A: Manual Deployment (Current Setup)

```bash
# Make changes to your code
git add .
git commit -m "feat: add new feature"
git push

# Deploy manually
npm run deploy
```

### Option B: Automatic Deployment (After Git Integration)

```bash
# Make changes to your code
git add .
git commit -m "feat: add new feature"
git push

# Cloudflare automatically builds and deploys!
# No manual deployment needed
```

---

## Verifying Deployment

### 1. Check Build Output

After running `npm run deploy`, look for:
```
✨ Success! Uploaded X files
✨ Deployment complete! Take a peek over at https://...
```

### 2. Visit Your Site

Open the provided URL in your browser and test:
- Game loads correctly
- Sprites render properly
- IndexedDB saves work
- All game features function

### 3. Test on Mobile

Visit the URL on your phone to test:
- Touch controls
- Responsive layout
- Performance

### 4. Check Developer Console

Open browser DevTools (F12):
- Look for any errors (red text)
- Verify assets loaded (Network tab)
- Check IndexedDB (Application tab)

---

## Troubleshooting

### Authentication Failed

```bash
# Re-login to Cloudflare
npx wrangler login

# Or logout first
npx wrangler logout
npx wrangler login
```

### Build Errors

```bash
# Test build locally first
npm run build

# If it fails, check error messages
# Usually TypeScript errors or missing dependencies
```

### Deployment Failed

```bash
# Check Wrangler version
npx wrangler --version

# Update if needed
npm install -D wrangler@latest

# Try again
npm run deploy
```

### Assets Not Loading

If sprites or data files don't load:
1. Check `vite.config.ts` has `base: '/'`
2. Verify `dist/` contains `data/` and `assets/` folders
3. Check browser console for 404 errors
4. Ensure build completed successfully

### IndexedDB Not Working

IndexedDB works the same on Cloudflare Pages as localhost:
- Make sure you're accessing via HTTPS (automatic on Cloudflare)
- Check browser compatibility (all modern browsers support it)
- Clear browser cache and try again

---

## Monitoring & Analytics

### Cloudflare Dashboard

View deployment info:
1. Go to https://dash.cloudflare.com/
2. Click "Workers & Pages" → "roguelike"
3. See:
   - Recent deployments
   - Build logs
   - Analytics (requests, bandwidth)
   - Custom domains

### View Deployment Logs

```bash
# Check recent deployments
npx wrangler pages deployment list --project-name=roguelike
```

### Enable Web Analytics (Optional)

Cloudflare offers free web analytics:
1. Go to your project dashboard
2. Enable "Web Analytics"
3. Add the provided script tag to your `index.html`
4. See visitor stats, page views, performance

---

## Costs

### Free Tier (Unlimited)
- **500 builds/month** - More than enough for hobby projects
- **Unlimited bandwidth** - Your static assets are free forever
- **Unlimited requests** - No limits on visitors
- **Custom domains** - Free SSL certificates
- **Preview deployments** - Test before going live

### You'll Never Need to Pay Unless:
- You exceed 500 builds/month (unlikely for solo dev)
- You use Cloudflare Functions (not needed for this game)

**Bottom Line**: This game will be free to host forever on Cloudflare Pages.

---

## Update & Rollback

### Deploy New Version

```bash
# Make changes
git add .
git commit -m "fix: bug fix"

# Deploy
npm run deploy
```

### Rollback to Previous Version

Via dashboard:
1. Go to https://dash.cloudflare.com/
2. Click "Workers & Pages" → "roguelike"
3. Click "Deployments" tab
4. Find the working version
5. Click "..." → "Rollback to this deployment"

---

## Next Steps

After your first successful deployment:

1. **Share your game**: Send the URL to friends!
2. **Set up custom domain** (optional): Make it `roguelike.yourname.com`
3. **Enable Git integration**: Automatic deployments on push
4. **Add analytics** (optional): See how many people play
5. **Monitor performance**: Check load times in different regions

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Build game locally (test before deploy) |
| `npm run deploy` | Build and deploy to production |
| `npm run deploy:preview` | Deploy to preview environment |
| `npx wrangler login` | Authenticate with Cloudflare |
| `npx wrangler logout` | Log out of Cloudflare |
| `npx wrangler pages deployment list` | View deployment history |

---

## Getting Help

- **Cloudflare Docs**: https://developers.cloudflare.com/pages/
- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/
- **Cloudflare Community**: https://community.cloudflare.com/
- **Check build logs**: Cloudflare dashboard → Your project → View build log

---

**Last Updated**: 2025-11-02
**Deployment Platform**: Cloudflare Pages
**Build Tool**: Vite 7.1.9
**CLI Tool**: Wrangler 4.45.3
