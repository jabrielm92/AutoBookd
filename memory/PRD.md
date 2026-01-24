# AutoBooked AI - Product Requirements Document

## Original Problem Statement
Build an autonomous AI Lead-to-Calendar Engine that:
1. Discovers and scrapes leads (Google Maps, lead databases)
2. Enriches leads with AI-powered scoring
3. Runs multi-channel outreach (Email, SMS, LinkedIn)
4. Qualifies leads through AI conversations
5. Books meetings automatically on calendar

## Architecture

### Backend (FastAPI + MongoDB)
- **Models**: Lead, Conversation, Niche, Booking, SystemConfig, MessageVariant, EmailDomain
- **Lead Scoring**: 0-100 rubric (Business Viability, Digital Weakness, Pain Signals, Reachability, Competitive Landscape)
- **Conversation State Machine**: Uncontacted → Outreach Sent → Engaged → Discovery → Qualified → Calendar Offered → Booked
- **API Routes**: /api/leads, /api/conversations, /api/niches, /api/bookings, /api/analytics, /api/config

### Frontend (React + TailwindCSS + Shadcn)
- Dashboard with KPIs and queues
- Leads management with bulk import
- Kanban pipeline view (drag & drop)
- Conversation viewer
- Niche management
- Calendar/Bookings
- Analytics with charts
- Settings for API keys

## User Personas
1. **Agency Owner**: Manages multiple niches, needs dashboard overview
2. **Sales Rep**: Uses pipeline view, manages conversations
3. **Admin**: Configures system settings, API keys

## What's Been Implemented (Phase 1 - Jan 24, 2025)

### Core Features
- [x] Lead CRUD with bulk import (CSV format)
- [x] AI-based lead scoring (95-point rubric implemented)
- [x] Conversation state machine
- [x] Niche management with performance tracking
- [x] Calendar booking system (built-in)
- [x] Analytics dashboard with charts
- [x] System config with API key management
- [x] Start/Stop system control
- [x] Priority & follow-up queues
- [x] Pipeline kanban with drag-drop

### Data Models Ready
- Lead scoring breakdown tracks: high_ticket_category, independent_business, active_business, no_online_booking, no_crm_detected, low_review_count, negative_reviews, recent_activity, email_found, owner_language, no_competitor

## Prioritized Backlog

### P0 (Next Phase - Integrations)
- [ ] OpenAI integration for AI-generated messages
- [ ] Resend integration for email outreach
- [ ] Twilio integration for SMS
- [ ] Calendly API integration
- [ ] Google Calendar sync

### P1 (Automation)
- [ ] Background worker for autonomous outreach
- [ ] Sentiment analysis for replies
- [ ] Auto-qualification logic
- [ ] A/B testing message variants

### P2 (Advanced)
- [ ] Google Maps scraping with Playwright
- [ ] Lead enrichment APIs (Apollo, ZoomInfo)
- [ ] Domain reputation management
- [ ] Niche auto-expansion logic

## Tech Stack
- Backend: FastAPI, MongoDB (Motor), Python 3.x
- Frontend: React 19, TailwindCSS, Shadcn/UI, Recharts
- Deployment: Railway (backend), Vercel (frontend), MongoDB Atlas

## Next Tasks
1. Integrate OpenAI for message generation
2. Connect Resend for email delivery
3. Setup Twilio for SMS
4. Calendly API for booking sync
5. Build background worker for autonomous mode
