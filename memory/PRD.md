# AutoBooked AI - Product Requirements Document

## Original Problem Statement
Build an autonomous AI Lead-to-Calendar Engine for AI consulting that:
1. **Discovers leads automatically** via Google Maps (SerpAPI) and enriches with Hunter.io
2. AI-researches websites to find pain points and personalization opportunities
3. Sends hyper-personalized 4-step email sequences via Resend
4. Classifies replies with AI and triggers auto-booking on positive intent
5. Full-funnel analytics dashboard

## Target Market
- **Primary Industries**: Professional services, Home services, Field services
- **Ideal Profile**: Local businesses with websites, 5-50 reviews, no enterprise software detected
- **Geography**: Configurable (default: Philadelphia, PA)

## Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py              # Main API with all routes
├── lead_scraper.py        # Google Maps (SerpAPI), Hunter.io, Website scraper
├── ai_engine.py           # OpenAI research, reply classification, sequence generation
├── email_engine.py        # Resend sending, sequence management, deliverability tracking
├── pipeline_controller.py # Autonomous orchestrator (5 background loops)
└── .env                   # API keys (SerpAPI, Hunter, OpenAI, Resend)
```

### Frontend (React + TailwindCSS + Shadcn)
```
/app/frontend/src/
├── pages/
│   ├── Dashboard.jsx      # KPIs, queues, pipeline overview
│   ├── Leads.jsx          # Lead management
│   ├── Pipeline.jsx       # Kanban view
│   ├── Conversations.jsx  # Message threads
│   ├── Discovery.jsx      # Configure scraping keywords/locations
│   ├── Bookings.jsx       # Calendar management
│   ├── Analytics.jsx      # Charts and metrics
│   └── Settings.jsx       # API keys, sender info
├── components/Layout.jsx  # Sidebar with system start/stop
└── lib/api.js             # API client
```

## Production Pipeline (5 Autonomous Loops)

1. **Scraping Loop** - Google Maps via SerpAPI
   - Configurable keywords and locations
   - Daily limits to manage API costs
   - Deduplication by domain/place_id

2. **Enrichment Loop** - Hunter.io
   - Find business emails from domain
   - Prefer generic emails (info@, contact@)
   - Verify email validity

3. **Research Loop** - OpenAI + Website Scraping
   - Scrape homepage, about, services pages
   - AI generates: pain_point, opportunity, personalized opener
   - Score leads 0-100 based on signals

4. **Sequence Loop** - 4-Step Email Cadence
   - Email 1 (Day 0): Personal opener proving research
   - Email 2 (Day 3): Pattern interrupt question
   - Email 3 (Day 6): Social proof / case study
   - Email 4 (Day 10): Breakup email

5. **Analytics Loop** - Funnel Tracking
   - Scrape → Enrich → Research → Outreach → Reply → Book
   - Deliverability stats (open/click/bounce rates)

## What's Been Implemented (Jan 26, 2025)

### Core Features ✅
- [x] Google Maps scraping via SerpAPI (tested, working)
- [x] Email enrichment via Hunter.io (tested, working)
- [x] Website scraping (httpx + BeautifulSoup)
- [x] AI research engine (OpenAI GPT-4o-mini)
- [x] AI reply classification (positive/neutral/negative)
- [x] 4-step email sequence generator (template + AI modes)
- [x] Email sending via Resend
- [x] Sequence management (pause/resume/stop)
- [x] Deliverability tracking
- [x] Full pipeline controller with 5 background loops
- [x] Pipeline analytics endpoint
- [x] System start/stop control
- [x] All API endpoints functional

### API Keys Configured ✅
- SerpAPI: 062497b... (250 free searches)
- Hunter.io: 7ad85eb... (50 free credits)
- OpenAI: Configured in system settings
- Resend: Configured in system settings
- From email: jabriel@arisolutionsinc.com

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/system/start | POST | Start autonomous pipeline |
| /api/system/stop | POST | Stop pipeline |
| /api/system/status | GET | Pipeline status + analytics |
| /api/scrape/now | POST | Manual scrape trigger |
| /api/leads/{id}/enrich | POST | Manual enrichment |
| /api/leads/{id}/research | POST | Manual AI research |
| /api/pipeline/analytics | GET | Full funnel metrics |
| /api/sequences | GET | Active email sequences |
| /api/config | GET/PUT | System configuration |

## Lead Scoring Algorithm

```
Score (0-100):
├── Reviews 5-50: +20 (sweet spot)
├── Reviews 50+: +10
├── Rating ≥4.0: +10
├── Rating <3.5: -10
├── Email confidence ≥80: +20
├── Email confidence ≥50: +10
├── Website scraped: +10
├── Meta description: +5
├── High quality research: +25
├── Medium quality research: +15
├── Pain point identified: +10
```

## Prioritized Backlog

### P0 - Immediate
- [ ] Test full autonomous cycle with real leads
- [ ] Verify email sending works in production
- [ ] Add Calendly webhook for booking sync

### P1 - Enhancements
- [ ] LinkedIn scraping (manual mode)
- [ ] Apollo.io integration for richer data
- [ ] Sentiment analysis on conversation threads
- [ ] A/B testing for email variants

### P2 - SaaS Features
- [ ] Multi-tenancy architecture
- [ ] Stripe subscription billing
- [ ] Domain reputation engine
- [ ] White-label support

## Deployment
- **Backend**: Railway (FastAPI + MongoDB)
- **Frontend**: Vercel (React)
- **Domain**: arisolutionsinc.com

## How to Use

1. **Configure Discovery** (/discovery)
   - Set keywords: plumber, accountant, law firm, etc.
   - Set locations: Philadelphia, PA, etc.

2. **Verify API Keys** (/settings)
   - All keys pre-configured
   - From email: jabriel@arisolutionsinc.com

3. **Start System** (sidebar button)
   - 5 autonomous loops begin
   - Scraping every 5 minutes
   - Enrichment every 30 seconds
   - Research every 30 seconds
   - Sequences processed every 60 seconds

4. **Monitor** (/dashboard, /analytics)
   - Track funnel conversions
   - Watch for replies
   - Manage sequences

## Testing Summary (Jan 26, 2025)

| Component | Status | Notes |
|-----------|--------|-------|
| SerpAPI scraping | ✅ PASS | 77 leads scraped |
| Hunter.io enrichment | ✅ PASS | 6 emails found |
| Website scraper | ✅ PASS | httpx working |
| AI research | ✅ PASS | High quality output |
| Enrich endpoint | ✅ PASS | POST method fixed |
| Research endpoint | ✅ PASS | Returns research JSON |
| Pipeline start/stop | ✅ PASS | All 5 loops run |
| Sequence creation | ✅ PASS | 2 active sequences |
