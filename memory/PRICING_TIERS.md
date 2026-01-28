# AutoBookd Pricing Tiers - Implementation Plan

**Created:** January 28, 2025
**Status:** PLANNED - Not yet implemented

---

## Tier Overview

| Tier | Price | Leads | Emails Found | Sequences | Your Profit | Margin |
|------|-------|-------|--------------|-----------|-------------|--------|
| **DIY** | $29.99 | Unlimited* | User handles | User handles | $29.99 | 100% |
| **Starter Pro** | $99 | 500 | ~300 | 1,500 | $39 | 39% |
| **Growth Pro** | $149 | 750 | ~450 | 2,250 | $59 | 40% |
| **Scale Pro** | $199 | 1,000 | ~600 | 3,000 | $79 | 40% |

*DIY limited by user's own API budgets

---

## Tier 0: DIY (CURRENTLY IMPLEMENTED)
**$29.99/month** - Bring Your Own Keys

### What's Included
- Full platform access
- Unlimited leads (limited by their API budgets)
- AI email sequences
- Conversation tracking
- Auto-reply (with Resend subdomain setup)

### What User Provides
- SerpAPI key
- Hunter.io key
- OpenAI key
- Resend key
- Apollo key (optional)

**Your margin: 100% ($29.99)**

**Target user:** Bootstrappers, developers, cost-optimizers who don't mind setup

---

## Tier 1: Starter Pro - 500 Leads
**$99/month**

### What They Get
| Feature | Allocation |
|---------|------------|
| Lead Discovery | 500 leads/month |
| Email Enrichment | Up to 300 emails found |
| AI Research & Scoring | All 500 leads |
| Email Sequences | 5-email sequences for all |
| Emails Sent | Up to 1,500/month |

### Your Cost Breakdown
| Service | Usage | Cost |
|---------|-------|------|
| SerpAPI | ~125 searches | $1.25 |
| Hunter.io | ~300 lookups | $14.70 |
| Apollo.io | ~200 backup lookups | $4.00 |
| OpenAI | 500 leads × $0.08 | $40.00 |
| Resend | 1,500 emails | $0 (free tier) |
| **Total Cost** | | **~$60** |

### Economics
- Price: $99
- Cost: $60
- **Gross Profit: $39 (39% margin)**

**Target user:** Solo consultants, freelancers, testing the waters

---

## Tier 2: Growth Pro - 750 Leads (RECOMMENDED)
**$149/month**

### What They Get
| Feature | Allocation |
|---------|------------|
| Lead Discovery | 750 leads/month |
| Email Enrichment | Up to 450 emails found |
| AI Research & Scoring | All 750 leads |
| Email Sequences | 5-email sequences for all |
| Emails Sent | Up to 2,250/month |

### Your Cost Breakdown
| Service | Usage | Cost |
|---------|-------|------|
| SerpAPI | ~188 searches | $1.88 |
| Hunter.io | ~450 lookups | $22.05 |
| Apollo.io | ~300 backup lookups | $6.00 |
| OpenAI | 750 leads × $0.08 | $60.00 |
| Resend | 2,250 emails | $0 (free tier covers) |
| **Total Cost** | | **~$90** |

### Economics
- Price: $149
- Cost: $90
- **Gross Profit: $59 (40% margin)**

**Target user:** Growing agencies, active sales teams, serious about outbound

### Why This is the Sweet Spot
1. $149 is a "business expense" - easy to justify
2. 750 leads = ~22 quality prospects at 3% conversion to meeting
3. One closed deal ($3K+) = 20 months of subscription
4. High enough volume to see real results
5. Low enough cost to not feel risky

---

## Tier 3: Scale Pro - 1,000 Leads
**$199/month**

### What They Get
| Feature | Allocation |
|---------|------------|
| Lead Discovery | 1,000 leads/month |
| Email Enrichment | Up to 600 emails found |
| AI Research & Scoring | All 1,000 leads |
| Email Sequences | 5-email sequences for all |
| Emails Sent | Up to 3,000/month |
| **Priority Support** | Included |

### Your Cost Breakdown
| Service | Usage | Cost |
|---------|-------|------|
| SerpAPI | ~250 searches | $2.50 |
| Hunter.io | ~600 lookups | $29.40 |
| Apollo.io | ~400 backup lookups | $8.00 |
| OpenAI | 1,000 leads × $0.08 | $80.00 |
| Resend | 3,000 emails | $0 (at limit) |
| **Total Cost** | | **~$120** |

### Economics
- Price: $199
- Cost: $120
- **Gross Profit: $79 (40% margin)**

**Target user:** Agencies managing multiple clients, sales teams, high-volume operations

---

## Revenue Projections (100 Customers)

| Mix | Revenue | Your Costs | Gross Profit |
|-----|---------|------------|--------------|
| 50 DIY, 30 Starter, 15 Growth, 5 Scale | $8,455/mo | $4,110/mo | **$4,345/mo** |
| 30 DIY, 25 Starter, 30 Growth, 15 Scale | $10,867/mo | $6,285/mo | **$4,582/mo** |
| 20 DIY, 20 Starter, 35 Growth, 25 Scale | $13,330/mo | $8,175/mo | **$5,155/mo** |

### Annual Revenue at 100 Customers
- Conservative mix: ~$52K/year gross profit
- Growth mix: ~$55K/year gross profit
- Premium mix: ~$62K/year gross profit

---

## Overage Pricing (Optional Add-On)

| Resource | Overage Rate |
|----------|--------------|
| Additional leads | $0.15/lead |
| Additional emails sent | $0.02/email |
| Additional AI sequences | $0.10/sequence |

---

## Positioning & Messaging

### DIY ($29.99)
> "Full control. Bring your own API keys and pay only for what you use."

### Starter Pro ($99)
> "Everything set up. Just log in and start finding leads."

### Growth Pro ($149)
> "Our most popular plan. Enough leads to fill your calendar every month."

### Scale Pro ($199)
> "For serious outbound. High volume, priority support, maximum results."

---

## Implementation Requirements

### Stripe Setup
1. Create 4 price tiers in Stripe
2. Update subscription flow to show all tiers
3. Handle tier-specific feature flags

### Backend Changes
1. Add `subscription_tier` field to user model
2. Track usage: leads_discovered, emails_found, sequences_sent per month
3. Implement usage limits per tier
4. Create master API key storage (your keys, not tenant keys)
5. Route Pro tier API calls through your keys

### Frontend Changes
1. Pricing page with tier comparison
2. Usage dashboard showing limits
3. Upgrade prompts at 80% and 100% usage
4. Settings page hides API key inputs for Pro tiers

### Usage Tracking
- Soft limit warning at 80%
- Hard pause at 100%
- Monthly reset on billing date

---

## Future Considerations

### Annual Discount
- $1,490/year for Growth Pro = 2 months free
- Improves cash flow and retention

### Agency Tier ($499/mo)
- White-label option
- 5,000 leads/month
- Multiple sub-accounts

### Trial Period
- 7-day free trial of Starter Pro
- Credit card required
- Auto-converts to paid

### Inbound Email Options
1. **Free:** Gmail/Outlook API polling (2-3 min delay)
2. **Premium Add-on ($25/mo):** Resend Pro with instant webhooks
   - User gets Resend Pro and sets up MX record
   - Detailed in setup guide

### Rollover Credits
- 10% unused credit rollover as retention incentive

---

## API Account Requirements (Your Master Accounts)

To offer Pro tiers, you need:

| Service | Plan Needed | Monthly Cost |
|---------|-------------|--------------|
| SerpAPI | Business ($50/5K) | ~$50-100 |
| Hunter.io | Starter ($49/1K) or Growth ($99/5K) | ~$99-199 |
| Apollo.io | Basic ($49/2.4K) | ~$49-99 |
| OpenAI | Pay-as-you-go | ~Variable |
| Resend | Free (3K/mo) or Pro ($20/50K) | ~$0-40 |

**Estimated master account costs at 10 Pro customers:** ~$300-500/mo
**Revenue at 10 Pro customers (avg $149):** ~$1,490/mo
**Net profit:** ~$1,000/mo

---

*Document last updated: January 28, 2025*
