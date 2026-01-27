# AutoBookd Deployment Guide

Complete deployment guide for Railway (backend), Vercel (frontend), and MongoDB Atlas.

## Prerequisites

- GitHub account with repository access
- Railway account (railway.app)
- Vercel account (vercel.com)
- MongoDB Atlas account
- Stripe account with API keys
- Domain: autobookd.arisolutionsinc.com

---

## 1. MongoDB Atlas Setup

### Create Cluster
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new project called "AutoBookd"
3. Build a new cluster (M0 free tier works for testing)
4. Choose your preferred region

### Configure Access
1. **Database Access**: Create a database user
   - Username: `arisolutionsinc_db_user`
   - Password: Use a strong password
   - Role: `readWriteAnyDatabase`

2. **Network Access**: Add IP addresses
   - For Railway: Add `0.0.0.0/0` (allow from anywhere)
   - Or get Railway's static IPs if using their addon

3. **Get Connection String**:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

---

## 2. Railway Backend Deployment

### Create Project
1. Go to [Railway](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Select your repository, choose `/app/backend` as root directory

### Environment Variables
Add these in Railway's environment settings:

```env
# MongoDB
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=autobookd

# Security
JWT_SECRET=your_secure_random_string_min_32_chars
ADMIN_EMAIL=jabriel@arisolutionsinc.com

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Tracking URL (your Vercel frontend domain)
TRACKING_BASE_URL=https://autobookd.arisolutionsinc.com

# CORS
CORS_ORIGINS=https://autobookd.arisolutionsinc.com,https://www.autobookd.arisolutionsinc.com
```

### Railway Settings
1. **Root Directory**: `/app/backend`
2. **Build Command**: `pip install -r requirements.txt`
3. **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`

### Custom Domain (Optional)
1. Go to Settings → Networking → Custom Domain
2. Add: `api.autobookd.arisolutionsinc.com`
3. Configure DNS CNAME record

---

## 3. Vercel Frontend Deployment

### Create Project
1. Go to [Vercel](https://vercel.com)
2. New Project → Import Git Repository
3. Select your repository

### Configuration
1. **Framework Preset**: Create React App
2. **Root Directory**: `frontend`
3. **Build Command**: `yarn build`
4. **Output Directory**: `build`

### Environment Variables
```env
REACT_APP_BACKEND_URL=https://api.autobookd.arisolutionsinc.com
# Or use Railway's generated URL: https://your-app.railway.app
```

### Custom Domain
1. Go to Project Settings → Domains
2. Add: `autobookd.arisolutionsinc.com`
3. Add: `www.autobookd.arisolutionsinc.com`
4. Configure DNS:
   - A Record: `@` → Vercel IP (76.76.21.21)
   - CNAME: `www` → `cname.vercel-dns.com`

---

## 4. Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.autobookd.arisolutionsinc.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret to Railway env vars

---

## 5. DNS Configuration

For `autobookd.arisolutionsinc.com`:

```
# Frontend (Vercel)
A     @     76.76.21.21
CNAME www   cname.vercel-dns.com

# Backend API (Railway - optional subdomain)
CNAME api   your-app.railway.app
```

---

## 6. Post-Deployment Checklist

### Backend
- [ ] Health check: `curl https://api.autobookd.arisolutionsinc.com/api/health`
- [ ] Test auth: Sign up, verify email, login
- [ ] Test Stripe webhook: Check Railway logs after test payment

### Frontend
- [ ] Landing page loads at autobookd.arisolutionsinc.com
- [ ] Login/signup flows work
- [ ] Dashboard loads after login
- [ ] Admin panel accessible for jabriel@arisolutionsinc.com

### Stripe
- [ ] Test checkout flow with test card
- [ ] Webhook events received
- [ ] Subscription status updates correctly

---

## 7. Troubleshooting

### MongoDB Connection Issues
- Ensure IP whitelist includes `0.0.0.0/0` for Railway (or Railway's static IPs)
- Check connection string format: `mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority`
- Verify user credentials and database roles
- **SSL Note**: The backend automatically configures TLS for MongoDB Atlas connections

### CORS Errors
- Add frontend domain to CORS_ORIGINS
- Ensure HTTPS is used everywhere

### Stripe Webhook Failures
- Check webhook signing secret matches
- Ensure endpoint URL is correct
- Check Railway logs for errors

### Build Failures
**Backend**: Check requirements.txt for compatible versions
**Frontend**: Run `yarn build` locally first to catch errors

---

## 8. Environment Variables Summary

### Backend (Railway)
| Variable | Description |
|----------|-------------|
| MONGO_URL | MongoDB Atlas connection string |
| DB_NAME | Database name (autobookd) |
| JWT_SECRET | Secret for JWT tokens |
| ADMIN_EMAIL | Admin user email |
| STRIPE_PUBLISHABLE_KEY | Stripe public key |
| STRIPE_SECRET_KEY | Stripe secret key |
| STRIPE_WEBHOOK_SECRET | Webhook signing secret |
| TRACKING_BASE_URL | Frontend URL for email tracking |
| CORS_ORIGINS | Allowed frontend origins |

### Frontend (Vercel)
| Variable | Description |
|----------|-------------|
| REACT_APP_BACKEND_URL | Backend API URL |

---

## Support

For deployment issues:
- Email: autobookd@arisolutionsinc.com
- Website: https://arisolutionsinc.com
