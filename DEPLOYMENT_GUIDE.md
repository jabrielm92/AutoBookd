# AutoBookd Deployment Guide

## Overview
Deploy AutoBookd to production using:
- **Frontend**: Vercel
- **Backend**: Railway
- **Database**: MongoDB Atlas
- **Domain**: autobookd.arisolutionsinc.com

---

## Step 1: MongoDB Atlas Setup

1. **Go to** [MongoDB Atlas](https://cloud.mongodb.com)
2. **Create account** or sign in
3. **Create a new cluster** (free tier M0 works)
4. **Create database user**:
   - Database Access → Add New Database User
   - Username: `autobookd_user`
   - Password: Generate secure password (save this!)
   - Privileges: "Read and Write to any database"
5. **Whitelist IPs**:
   - Network Access → Add IP Address
   - Click "Allow Access from Anywhere" (0.0.0.0/0) for Railway
6. **Get connection string**:
   - Clusters → Connect → Connect your application
   - Copy the connection string (looks like): 
   ```
   mongodb+srv://autobookd_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - Replace `<password>` with your actual password

---

## Step 2: Railway Backend Deployment

1. **Go to** [Railway.app](https://railway.app)
2. **Sign in** with GitHub
3. **New Project** → Deploy from GitHub repo
4. Select your repository or use "Deploy from Template"
5. **Configure Backend Service**:
   - Root Directory: `backend`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   
6. **Add Environment Variables** (Settings → Variables):
   ```
   MONGO_URL=mongodb+srv://autobookd_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=autobookd
   SERPAPI_KEY=your_serpapi_key
   HUNTER_API_KEY=your_hunter_key
   ```

7. **Generate Domain**:
   - Settings → Networking → Generate Domain
   - Or add custom domain: `api.autobookd.arisolutionsinc.com`
   
8. **Note the Railway URL** (e.g., `https://autobookd-backend.up.railway.app`)

---

## Step 3: Vercel Frontend Deployment

1. **Go to** [Vercel.com](https://vercel.com)
2. **Sign in** with GitHub
3. **Import Project** → Select your repository
4. **Configure**:
   - Framework: Create React App
   - Root Directory: `frontend`
   - Build Command: `yarn build`
   - Output Directory: `build`

5. **Add Environment Variable**:
   ```
   REACT_APP_BACKEND_URL=https://autobookd-backend.up.railway.app
   ```
   (Use your Railway backend URL from Step 2)

6. **Deploy**

7. **Add Custom Domain**:
   - Project Settings → Domains
   - Add: `autobookd.arisolutionsinc.com`
   - Follow DNS instructions (add CNAME record)

---

## Step 4: DNS Configuration (arisolutionsinc.com)

Add these DNS records in your domain registrar:

### For Frontend (Vercel):
```
Type: CNAME
Name: autobookd
Value: cname.vercel-dns.com
```

### For Backend API (Railway) - Optional:
```
Type: CNAME
Name: api.autobookd
Value: your-railway-domain.up.railway.app
```

---

## Step 5: Configure API Keys in App

After deployment, go to `https://autobookd.arisolutionsinc.com/settings`:

1. **OpenAI API Key** - For AI research and personalization
2. **Resend API Key** - For email sending
3. **Calendly Link** - Your booking link for auto-send
4. **From Email** - Must match verified Resend domain

---

## Step 6: Resend Email Setup

1. **Go to** [Resend.com](https://resend.com)
2. **Verify your domain** (arisolutionsinc.com):
   - Domains → Add Domain
   - Add DNS records as instructed (SPF, DKIM, DMARC)
3. **Create API Key**
4. **Add to AutoBookd Settings**

---

## Step 7: Calendly Webhook Setup

1. **Go to** [Calendly Developer Portal](https://developer.calendly.com)
2. **Create Webhook**:
   - URL: `https://api.autobookd.arisolutionsinc.com/api/webhooks/calendly`
   - Events: `invitee.created`, `invitee.canceled`
3. **Copy webhook signing key** to AutoBookd Settings (optional)

---

## Environment Variables Summary

### Backend (Railway):
```
MONGO_URL=mongodb+srv://...
DB_NAME=autobookd
SERPAPI_KEY=xxx
HUNTER_API_KEY=xxx
```

### Frontend (Vercel):
```
REACT_APP_BACKEND_URL=https://api.autobookd.arisolutionsinc.com
```

### In-App Settings:
- OpenAI API Key
- Resend API Key  
- From Email
- Sender Name
- Company Name
- Calendly Link
- Apollo API Key (future)

---

## Verification Checklist

- [ ] MongoDB Atlas cluster created and accessible
- [ ] Railway backend deployed and healthy (`/api/health` returns 200)
- [ ] Vercel frontend deployed and loading
- [ ] DNS configured for autobookd.arisolutionsinc.com
- [ ] API keys configured in Settings
- [ ] Resend domain verified
- [ ] Test mode works (start pipeline, check logs)
- [ ] Quick Scrape works on Discovery page
- [ ] Calendly webhook configured (optional)

---

## Troubleshooting

### Backend not connecting to MongoDB:
- Check MONGO_URL has correct password
- Verify IP whitelist includes 0.0.0.0/0
- Check Railway logs for connection errors

### Frontend not loading:
- Verify REACT_APP_BACKEND_URL is correct
- Check browser console for CORS errors
- Ensure Railway backend is running

### Emails not sending:
- Verify Resend domain is fully verified
- Check from_email matches verified domain
- Test with Test Mode first

---

## Cost Estimates (Monthly)

| Service | Free Tier | Paid |
|---------|-----------|------|
| MongoDB Atlas | 512MB free | $9+/mo |
| Railway | $5 credit | ~$5-20/mo |
| Vercel | 100GB free | $20/mo pro |
| Resend | 100 emails/day | $20/mo |
| SerpAPI | 100 searches/mo | $50/mo |
| Hunter.io | 50 credits/mo | $49/mo |

**Estimated Total**: $0-150/mo depending on usage

---

## Support

For issues, check:
- Railway Logs: Project → Deployments → View Logs
- Vercel Logs: Project → Deployments → Functions
- MongoDB: Cluster → Metrics → Real-time
