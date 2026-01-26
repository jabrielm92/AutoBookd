# AutoBookd - AI-Powered Lead Automation

## Product Overview
AutoBookd is an autonomous AI Lead-to-Calendar Engine for ARI Solutions Inc. that:
1. Discovers leads via Google Maps (SerpAPI) 
2. Enriches with email finding (Hunter.io)
3. AI-researches websites to find pain points
4. Sends hyper-personalized email sequences via Resend
5. Classifies replies and triggers auto-booking
6. Full-funnel analytics dashboard

**Domain**: autobookd.arisolutionsinc.com
**Company**: ARI Solutions Inc.

## What's Been Implemented (Jan 26, 2025)

### Real-Time Progress Modal ✅ (NEW)
- [x] Stage progress cards showing counts (Scraped, Enriched, Researched, In Sequence)
- [x] Auto-scrolling activity log with timestamps
- [x] Color-coded stage icons (Search, Mail, Brain, Send)
- [x] Success/Error/Warning indicators per activity
- [x] Auto-refresh every 2 seconds
- [x] "View Activity" button in navbar when pipeline is running
- [x] Activity logging in all pipeline loops (scrape, enrich, research, sequence, analytics)

### UI/UX Overhaul ✅
- [x] Top Navbar instead of sidebar
- [x] Clean "Swiss Utility" design
- [x] Dark Mode with rich midnight colors
- [x] All Emergent branding removed
- [x] Start Flow Modal (select product + discovery set before starting)

### Product & Discovery Management ✅
- [x] Products/Services - save multiple offerings with name, description, features
- [x] Discovery Sets - save named configurations (keywords, locations)
- [x] Start Modal - select which product + discovery set to use
- [x] AI uses product context to personalize all outreach

### Email Guidelines (AI Rules) ✅
- [x] Forbidden Words - words AI will NEVER use (e.g., "AI", "automation")
- [x] Preferred Words - words to favor (e.g., "solutions", "streamline")
- [x] Tone Selection - Professional/Friendly/Conversational/Direct
- [x] Max Words Per Email
- [x] Rule Toggles:
  - No exclamation marks
  - Always end with question
  - First name only (no Mr./Ms.)
  - Never mention competitors
  - No ROI/results promises

### Core Features ✅
- [x] Google Maps scraping via SerpAPI
- [x] Email enrichment via Hunter.io (priority over phone)
- [x] Website scraping + AI research
- [x] 4-step email sequence generator
- [x] Email sending via Resend
- [x] Bulk delete leads
- [x] CSV import
- [x] Timestamps on leads
- [x] Clickable Discovery pipeline cards
- [x] Calendly webhook integration
- [x] Test Mode (simulate without sending)

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/products | GET/POST | Manage products/services |
| /api/discovery-sets | GET/POST | Manage discovery configurations |
| /api/system/start | POST | Start pipeline with selections |
| /api/pipeline/activity | GET | Real-time activity log + counts |
| /api/leads/bulk-delete | POST | Delete multiple leads |
| /api/leads/import/csv | POST | Upload CSV file |
| /api/webhooks/calendly | POST | Booking webhook |

## Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py              # API routes + data models
├── lead_scraper.py        # SerpAPI, Hunter.io
├── ai_engine.py           # OpenAI research + sequence generation
├── email_engine.py        # Resend integration
├── pipeline_controller.py # 5 autonomous loops
└── .env                   # API keys
```

### Frontend (React + TailwindCSS + Shadcn)
```
/app/frontend/src/
├── components/
│   ├── Layout.jsx               # Navbar + Start Modal + Progress Modal trigger
│   └── RealTimeProgressModal.jsx # Activity feed + stage cards
├── pages/
│   ├── Dashboard.jsx      # KPIs + queues
│   ├── Leads.jsx          # Bulk select, CSV import
│   ├── Discovery.jsx      # Clickable funnel cards
│   ├── Settings.jsx       # Tabbed: General, Products, Discovery, Email Rules, API Keys
│   └── ...
└── lib/api.js             # API client (includes getPipelineActivity)
```

## Settings Tabs

1. **General** - Test mode, sender info, calendar, system settings
2. **Products** - CRUD for products/services
3. **Discovery** - CRUD for discovery sets
4. **Email Rules** - Forbidden/preferred words, tone, rules
5. **API Keys** - OpenAI, Resend, Apollo (future)

## Future Integrations

- **ColdIQ** (coldiq.arisolutionsinc.com) - Email optimization API
- **Apollo.io** - Richer lead enrichment
