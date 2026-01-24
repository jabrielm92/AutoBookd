# AutoBooked AI - Product Requirements Document

## Original Problem Statement
Build an autonomous AI Lead-to-Calendar Engine for AI consulting that:
1. **Discovers leads automatically** from Reddit, job postings, web searches (no capital required)
2. Scores leads based on AI consulting opportunity signals
3. Sends personalized email outreach via Resend
4. Follows up automatically
5. Books meetings on calendar

## Target Market
- **Primary Industries**: Professional services, Home services, Field services
- **Pain Signals**: Businesses showing signs of needing AI/automation
- **Scope**: Toggle between local businesses or anywhere

## Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py              # Main API with all routes
├── discovery_engine.py    # Autonomous lead discovery
├── outreach_engine.py     # Email outreach + follow-ups
├── autonomous_controller.py  # Orchestrates all engines
└── .env                   # API keys
```

### Frontend (React + TailwindCSS + Shadcn)
```
/app/frontend/src/
├── pages/
│   ├── Dashboard.jsx      # KPIs, queues, pipeline overview
│   ├── Leads.jsx          # Lead management, bulk import
│   ├── Pipeline.jsx       # Kanban drag-drop
│   ├── Conversations.jsx  # Message threads
│   ├── Discovery.jsx      # Configure autonomous discovery
│   ├── Bookings.jsx       # Calendar management
│   ├── Analytics.jsx      # Charts and metrics
│   └── Settings.jsx       # API keys, sender info
├── components/Layout.jsx  # Sidebar, system control
└── lib/api.js             # API client
```

## Discovery Sources (Zero Capital)

| Source | How It Works | Intent Signal |
|--------|--------------|---------------|
| **Reddit** | Mines r/smallbusiness, r/entrepreneur for AI/automation questions | Direct intent |
| **Job Postings** | Finds companies hiring for automatable roles (data entry, admin) | Hiring signal |
| **Web Search** | DuckDuckGo search by industry + location | Industry targeting |
| **Google Maps** | Coming soon with SerpAPI | Local businesses |

## Lead Scoring (AI Consulting Specific)

```
Intent Score (0-100):
├── AI Intent Keywords: +15 each (need automation, AI tools, etc.)
├── Pain Keywords: +10 each (slow response, manual process, etc.)
├── Hiring Signal: +40 (hiring for automatable roles)
├── Review Pain: +10-20 (complaints about response time, etc.)
└── Competitive Landscape: ±20 (no competitor tools detected)
```

## Conversation State Machine

```
UNCONTACTED → OUTREACH_SENT → ENGAGED → DISCOVERY → QUALIFIED → CALENDAR_OFFERED → BOOKED
                    ↓                                                    ↓
               (no reply)                                            STALLED
                    ↓                                                    ↓
            Follow-up (max 2)                                    RE-ENGAGE (30 days)
                    ↓
             DISQUALIFIED
```

## What's Been Implemented (Jan 24, 2025)

### Core Features
- [x] Autonomous Discovery Engine (Reddit, Jobs, Web Search)
- [x] AI-based lead scoring for AI consulting opportunities
- [x] Email outreach via Resend (personalized by pain signal)
- [x] Automatic follow-up engine
- [x] Pipeline kanban with drag-drop
- [x] Bookings calendar
- [x] Analytics dashboard
- [x] System start/stop control
- [x] Configurable discovery sources, industries, locations

### API Keys Required
- **OpenAI**: AI-powered personalization (optional but recommended)
- **Resend**: Email delivery (required for outreach)
- **Calendly**: Calendar booking sync (optional)

## Deployment Ready
- **Backend**: Railway (FastAPI + MongoDB)
- **Frontend**: Vercel (React)
- **Domain**: arisolutionsinc.com

## Prioritized Backlog

### P0 - Ready for Integration
- [ ] Add OpenAI key for AI personalization
- [ ] Add Resend key for email delivery
- [ ] Configure sender name/email in Settings
- [ ] Add target locations in Discovery

### P1 - Enhanced Discovery
- [ ] SerpAPI for reliable Google Maps scraping
- [ ] Apollo.io for richer lead data
- [ ] LinkedIn intent monitoring (manual mode)

### P2 - Advanced Automation
- [ ] Sentiment analysis on replies
- [ ] A/B testing message variants
- [ ] Domain reputation management
- [ ] Calendly webhook for booking sync

## How to Use

1. **Configure Discovery** (/discovery)
   - Toggle Local/Anywhere scope
   - Add target locations if local
   - Select industries to target
   - Add custom pain keywords

2. **Add API Keys** (/settings)
   - Resend key for emails
   - OpenAI key for AI personalization (optional)
   - Your name and email address

3. **Start System** (sidebar button)
   - Discovery runs every 5 minutes
   - Outreach sends to qualified leads
   - Follow-ups sent after 3 days

4. **Monitor Progress** (/dashboard, /analytics)
   - Track leads discovered
   - Watch reply and booking rates
   - Optimize based on what converts

## Next Actions
1. Provide Resend API key to enable email outreach
2. Configure discovery with target locations/industries
3. Press Start System to begin autonomous operation
4. (Later) Add SerpAPI for Google Maps scraping
