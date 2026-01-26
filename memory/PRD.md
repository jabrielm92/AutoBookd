# AutoBookd - AI-Powered Lead Automation

## Product Overview
AutoBookd is an autonomous AI Lead-to-Calendar Engine that:
1. Discovers leads automatically via Google Maps (SerpAPI) 
2. Enriches with email finding (Hunter.io)
3. AI-researches websites to find pain points and personalization opportunities
4. Sends hyper-personalized 4-step email sequences via Resend
5. Classifies replies with AI and triggers auto-booking on positive intent
6. Full-funnel analytics dashboard

**Domain**: autobookd.arisolutionsinc.com
**Company**: ARI Solutions Inc.

## Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py              # Main API with all routes + webhooks
├── lead_scraper.py        # Google Maps (SerpAPI), Hunter.io, Website scraper
├── ai_engine.py           # OpenAI research, reply classification
├── email_engine.py        # Resend sending, sequence management
├── pipeline_controller.py # Autonomous orchestrator (5 background loops)
└── .env                   # API keys
```

### Frontend (React + TailwindCSS + Shadcn)
```
/app/frontend/src/
├── components/Layout.jsx  # Top Navbar with system controls
├── pages/
│   ├── Dashboard.jsx      # KPIs, queues, clickable metrics
│   ├── Leads.jsx          # Lead table with bulk select/delete, CSV import
│   ├── Pipeline.jsx       # Kanban view
│   ├── Conversations.jsx  # Message threads
│   ├── Discovery.jsx      # Scraping config with clickable funnel cards
│   ├── Bookings.jsx       # Calendar view
│   ├── Analytics.jsx      # Charts
│   └── Settings.jsx       # API keys, test mode, calendar integration
└── lib/api.js             # API client
```

## What's Been Implemented (Jan 26, 2025)

### UI/UX Overhaul ✅
- [x] Top Navbar instead of sidebar
- [x] Clean "Swiss Utility" design (Manrope headings, Inter body)
- [x] Color scheme: Slate/Blue professional palette
- [x] All Emergent branding removed
- [x] Responsive mobile navigation

### Core Features ✅
- [x] Google Maps scraping via SerpAPI
- [x] Email enrichment via Hunter.io (priority over phone)
- [x] Website scraping (httpx + BeautifulSoup)
- [x] AI research engine (OpenAI GPT-4o-mini)
- [x] AI reply classification (positive/neutral/negative)
- [x] 4-step email sequence generator
- [x] Email sending via Resend
- [x] Full pipeline controller with 5 background loops
- [x] Test Mode - simulate full pipeline without sending emails

### New Features (This Session) ✅
- [x] Bulk delete leads (checkbox selection)
- [x] CSV file import for leads
- [x] Timestamps on all leads (Added column)
- [x] Clickable Discovery pipeline cards → filtered leads
- [x] Calendly webhook integration (auto-booking)
- [x] Reply classification webhook
- [x] LinkedIn manual import endpoint
- [x] Apollo.io API key field (ready for future)
- [x] Fixed Bookings page "failed to fetch" error

### Integrations ✅
- [x] SerpAPI - Google Maps scraping
- [x] Hunter.io - Email enrichment
- [x] OpenAI - AI research & classification
- [x] Resend - Email delivery
- [x] Calendly - Booking webhooks

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/system/start?test_mode=true | POST | Start pipeline (optional test mode) |
| /api/system/stop | POST | Stop pipeline |
| /api/leads/bulk-delete | POST | Delete multiple leads |
| /api/leads/import/csv | POST | Upload CSV file |
| /api/leads/import/linkedin | POST | Manual LinkedIn import |
| /api/webhooks/calendly | POST | Calendly booking webhook |
| /api/webhooks/email/reply | POST | Email reply classification |
| /api/scrape/now | POST | Manual scrape trigger |

## Deployment

See `/app/DEPLOYMENT_GUIDE.md` for step-by-step instructions:
- Frontend: Vercel
- Backend: Railway
- Database: MongoDB Atlas
- Domain: autobookd.arisolutionsinc.com

## Testing Status

| Feature | Status | 
|---------|--------|
| Navbar navigation | ✅ PASS |
| Dashboard metrics | ✅ PASS |
| Leads bulk select | ✅ PASS |
| Leads CSV import | ✅ PASS |
| Leads timestamps | ✅ PASS |
| Discovery clickable cards | ✅ PASS |
| Bookings page | ✅ PASS (fixed) |
| Settings page | ✅ PASS |
| Test mode | ✅ PASS |
| Bulk delete endpoint | ✅ PASS |

## Future Integrations (Planned)

- **ColdIQ** (coldiq.arisolutionsinc.com) - When API is ready:
  - Integrate email optimization before sending
  - Score and rewrite outreach emails
  - Track email quality improvements

- **Apollo.io** - API key field ready for:
  - Richer lead data enrichment
  - Company intelligence
  - Contact verification

## Backlog

### P2 - SaaS Features
- [ ] Multi-tenancy architecture
- [ ] Stripe subscription billing
- [ ] Domain reputation/warming engine
- [ ] A/B testing for email variants
- [ ] Apollo.io integration
- [ ] ColdIQ API integration
