# Frontend Deployment Guide

This guide covers deploying the WhatsApp Campaign System frontend to various hosting platforms.

## 📋 Pre-Deployment Checklist

- [ ] All tests passing
- [ ] No console errors in production build
- [ ] Environment variables configured
- [ ] Backend API accessible from deployment platform
- [ ] CORS configured on backend for deployment domain
- [ ] Build command verified locally
- [ ] Production build tested locally (`npm run preview`)

## 🏗️ Building for Production

### 1. Configure Environment

Create `.env.production`:

```env
VITE_API_BASE_URL=https://your-backend-api.com/api
```

### 2. Build Application

```bash
npm run build
```

This creates an optimized production bundle in the `dist/` directory:

```
dist/
├── assets/
│   ├── index-[hash].js      # Main JavaScript bundle
│   ├── index-[hash].css     # Main CSS bundle
│   └── ...                  # Other assets
├── index.html               # Entry HTML file
└── vite.svg                 # Favicon
```

### 3. Test Production Build Locally

```bash
npm run preview
```

Visit http://localhost:4173 to test the production build.

## 🚀 Deployment Platforms

### Option 1: Vercel (Recommended)

**Pros:** Zero-config, automatic HTTPS, global CDN, serverless functions support

#### Via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Set environment variables:**
   ```bash
   vercel env add VITE_API_BASE_URL
   ```
   Enter your production API URL when prompted.

5. **Deploy to production:**
   ```bash
   vercel --prod
   ```

#### Via Vercel Dashboard

1. Go to https://vercel.com
2. Click "New Project"
3. Import your Git repository
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Add environment variable:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-backend-api.com/api`
6. Click "Deploy"

**Custom Domain:** Add in Project Settings → Domains

---

### Option 2: Netlify

**Pros:** Continuous deployment, form handling, serverless functions

#### Via Netlify CLI

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login:**
   ```bash
   netlify login
   ```

3. **Initialize:**
   ```bash
   netlify init
   ```

4. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

#### Via Netlify Dashboard

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to your Git repository
4. Configure:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Add environment variable:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-backend-api.com/api`
6. Click "Deploy site"

**Redirects for SPA:** Create `public/_redirects`:
```
/*    /index.html   200
```

---

### Option 3: AWS S3 + CloudFront

**Pros:** Scalable, cost-effective, full AWS integration

#### Setup Steps

1. **Build application:**
   ```bash
   npm run build
   ```

2. **Create S3 bucket:**
   ```bash
   aws s3 mb s3://whatsapp-campaign-frontend
   ```

3. **Configure bucket for static hosting:**
   ```bash
   aws s3 website s3://whatsapp-campaign-frontend \
     --index-document index.html \
     --error-document index.html
   ```

4. **Upload files:**
   ```bash
   aws s3 sync dist/ s3://whatsapp-campaign-frontend
   ```

5. **Set bucket policy for public read:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::whatsapp-campaign-frontend/*"
       }
     ]
   }
   ```

6. **Create CloudFront distribution:**
   - Origin: S3 bucket endpoint
   - Default root object: `index.html`
   - Error pages: 404 → /index.html (for SPA routing)

7. **Configure HTTPS:**
   - Request SSL certificate via ACM
   - Attach to CloudFront distribution

**Continuous Deployment:** Use AWS CodePipeline or GitHub Actions

---

### Option 4: DigitalOcean App Platform

**Pros:** Simple pricing, managed infrastructure

1. Go to https://cloud.digitalocean.com
2. Click "Apps" → "Create App"
3. Connect repository
4. Configure:
   - **Type:** Static Site
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add environment variable:
   - `VITE_API_BASE_URL`
6. Click "Next" and review
7. Click "Create Resources"

---

### Option 5: GitHub Pages

**Pros:** Free hosting for public repos

1. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json:**
   ```json
   {
     "homepage": "https://yourusername.github.io/whatsapp-campaign-frontend",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Update vite.config.js for base path:**
   ```javascript
   export default defineConfig({
     base: '/whatsapp-campaign-frontend/',
     // ... rest of config
   })
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

**Note:** Not ideal for SPAs due to routing limitations. Use hash router if necessary.

---

## 🔐 Environment Variables

Set these on your deployment platform:

| Variable | Required | Example |
|----------|----------|---------|
| VITE_API_BASE_URL | Yes | https://api.example.com/api |

### Platform-Specific Instructions

**Vercel:**
```bash
vercel env add VITE_API_BASE_URL production
```

**Netlify:**
Site Settings → Environment Variables → Add variable

**AWS:**
Set in deployment script or use AWS Systems Manager Parameter Store

**DigitalOcean:**
App Settings → Environment Variables

---

## 🌐 Custom Domain Configuration

### Vercel
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed

### Netlify
1. Go to Site Settings → Domain management
2. Add custom domain
3. Configure DNS:
   - A record: 75.2.60.5
   - Or CNAME: your-site.netlify.app

### AWS CloudFront
1. Add alternate domain name (CNAME) to distribution
2. Create Route53 hosted zone
3. Add A record pointing to CloudFront distribution

---

## 🔒 HTTPS/SSL Configuration

### Vercel & Netlify
- Automatic HTTPS with Let's Encrypt
- No configuration needed

### AWS CloudFront
1. Request certificate in AWS Certificate Manager (ACM)
2. Validate domain ownership
3. Attach certificate to CloudFront distribution

### Custom SSL
- Upload certificate to hosting platform
- Configure HTTPS redirect

---

## 🚦 Post-Deployment Verification

### Checklist

- [ ] Site loads correctly at production URL
- [ ] All pages accessible
- [ ] Authentication flow works
- [ ] API calls successful (check Network tab)
- [ ] No console errors
- [ ] Images and assets load
- [ ] Mobile responsive design works
- [ ] HTTPS enabled
- [ ] Custom domain configured (if applicable)
- [ ] Redirects working for SPA routes

### Testing

1. **Manual testing:**
   - Login/logout
   - Navigate all routes
   - Test CRUD operations
   - Test real-time updates

2. **Lighthouse audit:**
   ```bash
   npm install -g lighthouse
   lighthouse https://your-production-url.com
   ```

3. **Check SEO:**
   - Meta tags present
   - Title tags set
   - Robots.txt configured

---

## 🔄 Continuous Deployment (CI/CD)

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Build
        working-directory: ./frontend
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
```

**Required Secrets:**
- `VITE_API_BASE_URL`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

---

## 🐛 Troubleshooting

### Issue: 404 on Page Refresh

**Cause:** SPA routing not configured on server

**Solutions:**

**Vercel:** Create `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Netlify:** Create `public/_redirects`:
```
/*    /index.html   200
```

**AWS S3:** Set error document to `index.html`

---

### Issue: Environment Variables Not Working

**Check:**
1. Variables prefixed with `VITE_`
2. Server restarted after adding variables
3. Build command includes environment variables
4. Variables set on deployment platform

---

### Issue: CORS Errors

**Solution:**

Configure backend CORS to allow frontend origin:

```javascript
// Backend Express example
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true
}));
```

---

### Issue: Large Bundle Size

**Optimize:**

1. **Code splitting:**
   ```javascript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

2. **Analyze bundle:**
   ```bash
   npm install --save-dev rollup-plugin-visualizer
   ```

3. **Remove unused dependencies:**
   ```bash
   npm prune
   ```

---

## 📊 Performance Optimization

### Production Checklist

- [ ] Code splitting implemented
- [ ] Images optimized (WebP format)
- [ ] Lazy loading for routes
- [ ] Tree shaking enabled (automatic with Vite)
- [ ] Minification enabled (automatic in production)
- [ ] Gzip compression enabled on server
- [ ] CDN configured for assets
- [ ] Service worker for offline support (optional)

### Vite Optimizations

Already configured in `vite.config.js`:
- Minification
- Tree shaking
- Code splitting
- Asset optimization

---

## 🔐 Security Checklist

- [ ] HTTPS enabled
- [ ] Secure headers configured (CSP, HSTS, X-Frame-Options)
- [ ] No sensitive data in client code
- [ ] API keys not exposed
- [ ] Dependencies up to date (`npm audit`)
- [ ] Rate limiting on API
- [ ] XSS protection enabled
- [ ] CSRF protection on forms

---

## 📈 Monitoring & Analytics

### Recommended Tools

1. **Google Analytics:**
   - Add tracking code to `index.html`

2. **Sentry for Error Tracking:**
   ```bash
   npm install @sentry/react
   ```

3. **Vercel Analytics:**
   - Automatic with Vercel deployment

4. **Uptime Monitoring:**
   - UptimeRobot
   - Pingdom

---

## 💰 Cost Estimates

### Vercel
- **Free tier:** Generous limits, suitable for small projects
- **Pro:** $20/month per member

### Netlify
- **Free tier:** 100GB bandwidth, 300 build minutes
- **Pro:** $19/month

### AWS S3 + CloudFront
- **Storage:** ~$0.023/GB/month
- **Transfer:** ~$0.085/GB
- **Requests:** Minimal cost
- **Estimated:** $5-20/month for small app

### DigitalOcean
- **Basic:** $5/month
- **Professional:** $12/month

---

## 📞 Support

For deployment issues:
1. Check platform-specific documentation
2. Review deployment logs
3. Test production build locally first
4. Contact development team

---

**Last Updated:** 2025-11-14
**Supported Platforms:** Vercel, Netlify, AWS, DigitalOcean, GitHub Pages
