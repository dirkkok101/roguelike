# Hosting Options for ASCII Roguelike

**Research Date**: 2025-11-02
**Project Type**: Static web application (Vite + TypeScript + Canvas 2D)
**Requirements**: Static file hosting, no backend needed, IndexedDB support (client-side)

---

## Summary Recommendation

**Best Option**: **Cloudflare Pages** (Free tier)
- Fastest performance (300+ edge locations)
- Unlimited bandwidth for static assets
- 500 builds/month (plenty for a hobby project)
- Automatic SSL, DDoS protection
- Simple Git integration
- Best-in-class global CDN

**Runner-up**: **Vercel** (Free tier)
- Excellent developer experience
- 100GB bandwidth/month
- 6,000 build minutes/month
- Great analytics dashboard

---

## Detailed Comparison

### 1. Cloudflare Pages ⭐ RECOMMENDED

**Pricing**: FREE
- 500 builds/month
- Unlimited bandwidth for static assets
- 1 concurrent build
- Unlimited sites

**Pros**:
- **Fastest network**: 115% faster than competitors (300+ edge locations)
- **Unlimited bandwidth**: No data transfer costs for static assets
- **Built-in security**: DDoS protection, bot mitigation, automatic SSL
- **Zero config**: Automatic Vite detection
- **Custom domains**: Free with automatic SSL

**Cons**:
- Fewer builds/month than Vercel (but 500 is plenty)
- Newer platform (less mature than Netlify/Vercel)

**Deployment**:
```bash
npm run build
npx wrangler pages deploy dist
```

**Git Integration**: Connect GitHub repo for automatic deployments

**Official Docs**: https://developers.cloudflare.com/pages/

---

### 2. Vercel

**Pricing**: FREE
- 100GB bandwidth/month
- 6,000 build minutes/month
- 100 GB-hours serverless functions
- Unlimited sites

**Pros**:
- **Generous build limits**: 6,000 minutes (most free tier)
- **Excellent DX**: Best developer experience, great dashboard
- **Fast deployments**: Optimized for modern frameworks
- **Analytics**: Built-in web analytics
- **Preview deployments**: Automatic preview URLs for PRs

**Cons**:
- Bandwidth cap (100GB/month)
- Paid plans are expensive ($20/user/month)

**Deployment**:
```bash
npm i -g vercel
vercel
```

**Git Integration**: Connect GitHub repo for automatic deployments

**Official Docs**: https://vercel.com/docs

---

### 3. Netlify

**Pricing**: FREE
- 100GB bandwidth/month
- 300 build minutes/month (lowest of top 3)
- 100 form submissions/month

**Pros**:
- **Feature-rich**: Forms, identity, redirects, headers
- **Mature platform**: Industry standard since 2014
- **Split testing**: A/B testing built-in
- **Netlify CMS**: Optional content management

**Cons**:
- **Limited build minutes**: Only 300/month on free tier
- Slightly slower than Cloudflare/Vercel
- Bandwidth cap (100GB/month)

**Deployment**:
```bash
npm i -g netlify-cli
ntl init
ntl deploy --prod
```

**Git Integration**: Connect GitHub repo for automatic deployments

**Official Docs**: https://docs.netlify.com/

---

### 4. GitHub Pages

**Pricing**: FREE
- Unlimited bandwidth (soft limit)
- Unlimited builds
- 1GB storage limit

**Pros**:
- **Dead simple**: Built into GitHub
- **Zero setup**: Works from repository settings
- **Custom domains**: Free with manual SSL setup
- **No CLI needed**: Can deploy via GitHub Actions

**Cons**:
- Slower than CDN-based options
- No advanced features (redirects, headers)
- Public repos only (or pay for GitHub Pro)
- Static sites only (no serverless functions)

**Deployment**:
```bash
npm run build
gh-pages -d dist
```

**Or via GitHub Actions**: See official Vite docs for workflow

**Official Docs**: https://docs.github.com/en/pages

---

### 5. Render

**Pricing**: FREE (Static sites)
- Unlimited bandwidth
- Automatic SSL
- Continuous deployment

**Pros**:
- **Free static hosting**: No bandwidth limits
- **Auto-deploy**: Push to Git, auto-deploy
- **Custom domains**: Free SSL
- **Pull request previews**: Test before merging

**Cons**:
- Smaller network (fewer edge locations)
- Slower than Cloudflare/Vercel
- Less mature than competitors

**Deployment**: Connect Git repo via dashboard

**Official Docs**: https://render.com/docs/static-sites

---

## Feature Comparison Matrix

| Feature | Cloudflare Pages | Vercel | Netlify | GitHub Pages | Render |
|---------|------------------|--------|---------|--------------|--------|
| **Bandwidth** | Unlimited | 100GB | 100GB | Unlimited* | Unlimited |
| **Builds/Month** | 500 | Unlimited | 300 | Unlimited | Unlimited |
| **Build Minutes** | N/A | 6,000 | 300 | Unlimited | N/A |
| **Sites** | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |
| **Custom Domain** | ✅ Free SSL | ✅ Free SSL | ✅ Free SSL | ✅ Manual SSL | ✅ Free SSL |
| **Git Integration** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Preview Deploys** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Edge Network** | ⭐ 300+ | ✅ Global | ✅ Global | ❌ Limited | ✅ Regional |
| **Analytics** | Paid | ✅ Built-in | Paid | ❌ | ❌ |
| **Performance** | ⭐ Fastest | Fast | Fast | Slower | Moderate |
| **DDoS Protection** | ✅ Enterprise | ✅ | ✅ | ❌ | ✅ |

*GitHub Pages has soft limits, may throttle high-traffic sites

---

## Specific Recommendations for This Project

### For Development/Testing
**Use**: **Vercel** or **Cloudflare Pages**
- Fast deployment times
- Preview URLs for testing
- Easy rollbacks

### For Production/Public Launch
**Use**: **Cloudflare Pages**
- Best performance (critical for canvas rendering)
- Unlimited bandwidth (if game goes viral)
- Enterprise-grade DDoS protection
- Free forever (no bandwidth surprises)

### For Simplicity
**Use**: **GitHub Pages**
- Already on GitHub
- One less service to manage
- Good enough for hobby projects

---

## Deployment Instructions

### Recommended: Cloudflare Pages

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Build your game**:
   ```bash
   npm run build
   ```

3. **Deploy**:
   ```bash
   npx wrangler pages deploy dist --project-name=roguelike
   ```

4. **Or use Git Integration**:
   - Go to https://dash.cloudflare.com/
   - Click "Pages" → "Create a project"
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Deploy!

5. **Custom Domain** (optional):
   - Add custom domain in Cloudflare dashboard
   - Update DNS records (automatic if using Cloudflare DNS)

**Your site will be live at**: `https://roguelike.pages.dev`

---

## Build Configuration

Your `vite.config.ts` is already configured correctly for static hosting:

```typescript
export default defineConfig({
  base: '/', // Change to '/repo-name/' for GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Enable for debugging
  }
})
```

**For GitHub Pages only**: If deploying to `https://username.github.io/roguelike/`, change `base` to `'/roguelike/'`

---

## Cost Estimates

### Current (Free Tier)
- **Cloudflare Pages**: $0/month (unlimited)
- **Vercel**: $0/month (100GB bandwidth)
- **Netlify**: $0/month (100GB bandwidth)
- **GitHub Pages**: $0/month (unlimited)

### If You Exceed Free Limits (High Traffic)
- **Cloudflare Pages**: $0/month (static assets never charged)
- **Vercel**: $20/month (Pro plan) or $0.40/GB overage
- **Netlify**: $19/month (Pro plan) or $55/100GB overage
- **GitHub Pages**: Free (may throttle, but won't charge)

**Verdict**: Cloudflare Pages is the safest choice for unexpected traffic spikes

---

## Next Steps

1. **Choose a platform**: Cloudflare Pages recommended
2. **Test deployment**: Deploy to staging first
3. **Verify game works**: Test on mobile, different browsers
4. **Check IndexedDB**: Ensure saves persist across deployments
5. **Set up custom domain** (optional): `roguelike.yourname.com`
6. **Add analytics** (optional): Vercel Analytics or Cloudflare Web Analytics
7. **Monitor performance**: Check load times, canvas rendering

---

## Questions?

- **Do I need a backend?** No, your game is fully client-side with IndexedDB
- **Will saves persist?** Yes, IndexedDB is browser storage (not server)
- **Can I use a custom domain?** Yes, all platforms support this for free
- **What about SSL/HTTPS?** Automatic on all platforms
- **How do I update the game?** Just push to Git (auto-deploy) or run deploy command

---

## References

- [Vite Static Deployment Guide](https://vite.dev/guide/static-deploy)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com/)
- [GitHub Pages Docs](https://docs.github.com/en/pages)

---

**Last Updated**: 2025-11-02
