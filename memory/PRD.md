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
├── server.py              # Main API with all routes + webhooks
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
│   └── Settings.jsx       # API keys, test mode, calendar integration
├── components/Layout.jsx  # Sidebar with system start/stop + test mode indicator
└── lib/api.js             # API client
```

## What's Been Implemented (Jan 26, 2025)

### Core Features ✅
- [x] Google Maps scraping via SerpAPI
- [x] Email enrichment via Hunter.io
- [x] Website scraping (httpx + BeautifulSoup)
- [x] AI research engine (OpenAI GPT-4o-mini)
- [x] AI reply classification (positive/neutral/negative)
- [x] 4-step email sequence generator
- [x] Email sending via Resend
- [x] Sequence management (pause/resume/stop)
- [x] Deliverability tracking
- [x] Full pipeline controller with 5 background loops
- [x] Pipeline analytics endpoint

### NEW: Test Mode ✅
- [x] Test mode toggle in Settings
- [x] Simulates full pipeline without sending real emails
- [x] Logs show `[TEST MODE] Would send email to...`
- [x] Test mode indicator in sidebar when running

### NEW: Calendly Integration ✅
- [x] Calendly booking link field in Settings
- [x] `POST /api/webhooks/calendly` endpoint
- [x] Auto-updates lead status to "booked" on booking
- [x] Stops active sequences when lead books
- [x] Creates booking record in database

### NEW: Reply Classification ✅
- [x] `POST /api/webhooks/email/reply` endpoint
- [x] AI classifies replies as positive/neutral/negative
- [x] Determines action: send_calendar / human_review / unsubscribe
- [x] Auto-sends Calendly link on positive intent
- [x] Updates lead status and stops sequences on negative

### NEW: LinkedIn Import ✅
- [x] `POST /api/leads/import/linkedin` endpoint
- [x] Manual import of LinkedIn profile data
- [x] Stores LinkedIn-specific context (URL, headline, about)
- [x] Calculates lead score

### NEW: Settings Enhancements ✅
- [x] Test mode toggle with visual indicator
- [x] Calendly booking link field
- [x] Apollo.io API key field (for future integration)
- [x] LinkedIn session cookie field (for future automation)

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/system/start?test_mode=true | POST | Start pipeline (optional test mode) |
| /api/system/stop | POST | Stop pipeline |
| /api/system/status | GET | Status + test_mode flag |
| /api/webhooks/calendly | POST | Calendly booking webhook |
| /api/webhooks/email/reply | POST | Email reply classification |
| /api/leads/import/linkedin | POST | Manual LinkedIn import |
| /api/scrape/now | POST | Manual scrape trigger |
| /api/leads/{id}/enrich | POST | Manual enrichment |
| /api/leads/{id}/research | POST | Manual AI research |
| /api/pipeline/analytics | GET | Full funnel metrics |
| /api/sequences | GET | Active email sequences |
| /api/config | GET/PUT | System configuration |

## Settings Fields

| Field | Purpose |
|-------|---------|
| test_mode | Enable/disable email simulation |
| calendly_link | Booking link for auto-send |
| calendly_api_key | Webhook verification |
| apollo_api_key | Future: richer lead data |
| linkedin_cookie | Future: LinkedIn automation |
| openai_api_key | AI research & classification |
| resend_api_key | Email delivery |

## Prioritized Backlog

### P0 - Immediate ✅ DONE
- [x] Test mode implementation
- [x] Calendly webhook integration
- [x] Reply sentiment/classification
- [x] LinkedIn manual import

### P1 - Enhancements ✅ DONE
- [x] Apollo.io API key field (ready for future integration)
- [x] LinkedIn cookie field (ready for future automation)

### P2 - SaaS Features
- [ ] Multi-tenancy architecture
- [ ] Stripe subscription billing
- [ ] Domain reputation engine
- [ ] A/B testing for email variants
- [ ] Apollo.io integration (data enrichment)
- [ ] LinkedIn automation (profile scraping)

## Testing Summary (Jan 26, 2025)

| Feature | Status | Notes |
|---------|--------|-------|
| Test mode | ✅ PASS | Emails simulated, not sent |
| Calendly webhook | ✅ PASS | Creates booking, updates lead |
| Reply classification | ✅ PASS | AI intent detection works |
| LinkedIn import | ✅ PASS | Lead created with score |
| Settings UI | ✅ PASS | All new fields render |
| System start/stop | ✅ PASS | Test mode indicator shows |
