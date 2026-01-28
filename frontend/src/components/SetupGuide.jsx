import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, ChevronRight, ChevronLeft, CheckCircle, ExternalLink, 
  Search, Mail, Database, Calendar, Brain, Copy, Check,
  MessageSquare, Globe, ArrowRight, X, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import api from '@/lib/api';
import { toast } from 'sonner';

// All detailed guides
const detailedGuides = {
  serpapi: {
    title: 'SerpAPI Setup Guide',
    subtitle: 'Lead Discovery via Google Maps',
    sections: [
      {
        title: 'What is SerpAPI?',
        content: `SerpAPI allows AutoBookd to search Google Maps and find business leads based on your keywords and locations.

Example: Search "Dentist in Philadelphia" and get 20+ leads with:
• Business name & address
• Phone number
• Website URL
• Google rating & review count`
      },
      {
        title: 'Step 1: Create Account',
        content: `1. Go to serpapi.com
2. Click "Register" (top right)
3. Sign up with email or Google
4. Verify your email address`
      },
      {
        title: 'Step 2: Get Your API Key',
        content: `1. Log into your SerpAPI dashboard
2. Your API key is displayed on the main dashboard
3. Or navigate to: serpapi.com/manage-api-key
4. Copy the full API key`
      },
      {
        title: 'Step 3: Add to AutoBookd',
        content: `1. Go to Settings in AutoBookd
2. Scroll to "API Keys" section
3. Paste your key in the "SerpAPI Key" field
4. Click Save`
      },
      {
        title: 'Free Tier & Pricing',
        content: `Free Tier:
• 100 searches/month

Paid Plans:
• $50/month = 5,000 searches
• $130/month = 15,000 searches
• Pay-as-you-go available

Tip: Each "Discovery Set" run uses 1 search per keyword+location combo.
Example: 3 keywords × 2 locations = 6 searches`
      },
      {
        title: 'Troubleshooting',
        content: `"Invalid API Key" error?
• Check for extra spaces when copying
• Regenerate key in SerpAPI dashboard

"Rate limit exceeded"?
• You've hit your monthly limit
• Upgrade plan or wait for reset

No results found?
• Try broader keywords
• Check location spelling`
      }
    ]
  },
  hunter: {
    title: 'Hunter.io Setup Guide',
    subtitle: 'Email Finding & Verification',
    sections: [
      {
        title: 'What is Hunter.io?',
        content: `Hunter.io finds email addresses for businesses by:
• Searching their domain
• Finding employee emails
• Verifying email deliverability

AutoBookd uses Hunter to find contact emails for leads discovered via Google Maps.`
      },
      {
        title: 'Step 1: Create Account',
        content: `1. Go to hunter.io
2. Click "Sign up free"
3. Register with email or Google
4. Verify your email`
      },
      {
        title: 'Step 2: Get Your API Key',
        content: `1. Log into Hunter.io
2. Click your profile icon (top right)
3. Select "API"
4. Or go directly to: hunter.io/api-keys
5. Copy your API key`
      },
      {
        title: 'Step 3: Add to AutoBookd',
        content: `1. Go to Settings in AutoBookd
2. Scroll to "API Keys" section
3. Paste your key in "Hunter.io API Key" field
4. Select "Hunter" as your Enrichment Provider
5. Click Save`
      },
      {
        title: 'Free Tier & Pricing',
        content: `Free Tier:
• 25 searches/month
• 50 verifications/month

Paid Plans:
• Starter ($49/mo) = 500 searches
• Growth ($149/mo) = 5,000 searches
• Business ($499/mo) = 50,000 searches

Each lead enrichment = 1 search credit`
      },
      {
        title: 'Hunter vs Apollo',
        content: `Hunter.io:
✓ Better for small businesses
✓ More reliable email finding
✓ Simpler API

Apollo.io:
✓ More company data
✓ Decision-maker contacts
✓ LinkedIn integration

Recommendation: Start with Hunter, add Apollo for enterprise leads.`
      }
    ]
  },
  openai: {
    title: 'OpenAI Setup Guide',
    subtitle: 'AI Research & Email Generation',
    sections: [
      {
        title: 'What is OpenAI used for?',
        content: `AutoBookd uses OpenAI's GPT-4 to:
• Research each lead's website
• Identify pain points & opportunities
• Generate personalized email sequences
• Classify incoming reply intent

This is what makes your emails hyper-personalized, not generic templates.`
      },
      {
        title: 'Step 1: Create Account',
        content: `1. Go to platform.openai.com
2. Click "Sign up"
3. Verify email & phone number
4. Complete account setup`
      },
      {
        title: 'Step 2: Add Payment Method',
        content: `OpenAI requires a payment method (no free tier for API):

1. Go to platform.openai.com/account/billing
2. Click "Add payment method"
3. Enter credit card details
4. Set a spending limit (recommended: $20-50/month to start)`
      },
      {
        title: 'Step 3: Get API Key',
        content: `1. Go to platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it "AutoBookd" (optional)
4. Copy the key immediately (shown only once!)

⚠️ Keep this key secret - never share it publicly.`
      },
      {
        title: 'Step 4: Add to AutoBookd',
        content: `1. Go to Settings in AutoBookd
2. Scroll to "API Keys" section
3. Paste in "OpenAI API Key" field
4. Click Save`
      },
      {
        title: 'Pricing & Usage',
        content: `GPT-4o (what AutoBookd uses):
• ~$0.01-0.03 per lead researched
• ~$0.02-0.05 per email sequence generated

Typical costs:
• 100 leads/month = ~$3-5
• 500 leads/month = ~$15-25
• 1000 leads/month = ~$30-50

Set a spending limit in OpenAI dashboard to control costs.`
      },
      {
        title: 'Troubleshooting',
        content: `"Invalid API key"?
• Key may have expired - create new one
• Check for spaces when pasting

"Insufficient quota"?
• Add payment method
• Check billing at platform.openai.com/account/billing

"Rate limit exceeded"?
• Temporary - wait 1 minute and retry
• Consider upgrading usage tier`
      }
    ]
  },
  resend: {
    title: 'Resend Setup Guide',
    subtitle: 'Email Sending & Domain Verification',
    sections: [
      {
        title: 'What is Resend?',
        content: `Resend is a modern email API that AutoBookd uses to:
• Send outreach emails from your domain
• Track opens and clicks
• Handle bounces and complaints
• Receive inbound replies (with webhook)

Emails appear to come from you (e.g., you@yourdomain.com), not AutoBookd.`
      },
      {
        title: 'Step 1: Create Account',
        content: `1. Go to resend.com
2. Click "Start Building" or "Sign Up"
3. Register with email or GitHub
4. Verify your email`
      },
      {
        title: 'Step 2: Add Your Domain',
        content: `1. In Resend, go to Domains → Add Domain
2. Enter your domain (e.g., yourdomain.com)
3. Resend will show you DNS records to add

You'll need to add these records in your DNS provider:
• DKIM record (TXT)
• SPF record (TXT) - if not already set
• Optional: DMARC record`
      },
      {
        title: 'Step 3: Configure DNS',
        content: `In your DNS provider (GoDaddy, Cloudflare, etc.):

DKIM Record:
┌─────────────────────────────────────────────────┐
│ Type: TXT                                       │
│ Name: resend._domainkey                         │
│ Value: [Provided by Resend]                     │
│ TTL: 1 Hour                                     │
└─────────────────────────────────────────────────┘

Wait 15-60 minutes for DNS propagation, then click "Verify" in Resend.`
      },
      {
        title: 'Step 4: Get API Key',
        content: `1. In Resend, go to API Keys
2. Click "Create API Key"
3. Name it "AutoBookd"
4. Select permissions: "Sending access" + "Full access" (for webhooks)
5. Copy the key`
      },
      {
        title: 'Step 5: Add to AutoBookd',
        content: `1. Go to Settings in AutoBookd
2. In "Email Settings" section:
   • Paste Resend API Key
   • Set "From Email" (e.g., outreach@yourdomain.com)
   • Set "Sender Name" (your name or company)
3. Click Save`
      },
      {
        title: 'Free Tier & Pricing',
        content: `Free Tier:
• 3,000 emails/month
• 100 emails/day

Paid Plans:
• Pro ($20/mo) = 50,000 emails/month
• Scale ($90/mo) = 100,000 emails/month

Most users stay on free tier for months.`
      },
      {
        title: 'Troubleshooting',
        content: `Domain not verifying?
• Check DNS records are exactly as shown
• Wait up to 1 hour for propagation
• Use mxtoolbox.com to verify records

Emails going to spam?
• Ensure SPF and DKIM are set
• Add DMARC record
• Warm up your domain slowly (start with 10-20/day)`
      }
    ]
  },
  calendly: {
    title: 'Calendly Setup Guide',
    subtitle: 'Meeting Booking Integration',
    sections: [
      {
        title: 'What is Calendly?',
        content: `Calendly lets leads book meetings directly from your emails.

When a lead shows interest, AutoBookd sends your Calendly link. The lead picks a time that works for both of you - no back-and-forth scheduling emails.`
      },
      {
        title: 'Step 1: Create Account',
        content: `1. Go to calendly.com
2. Click "Sign up" (free)
3. Register with Google, Microsoft, or email
4. Connect your calendar (Google/Outlook)`
      },
      {
        title: 'Step 2: Create Event Type',
        content: `1. Click "Create" → "Event type"
2. Choose "One-on-One"
3. Set up your event:
   • Name: "Discovery Call" or "15-Minute Chat"
   • Duration: 15-30 minutes recommended
   • Location: Zoom, Google Meet, or Phone
4. Save the event`
      },
      {
        title: 'Step 3: Get Your Booking Link',
        content: `1. Click on your event type
2. Copy the scheduling link
   Format: calendly.com/yourname/event-name

Example: calendly.com/john-smith/discovery-call`
      },
      {
        title: 'Step 4: Add to AutoBookd',
        content: `1. Go to Settings in AutoBookd
2. In "System Settings" section
3. Paste your link in "Calendly Link" field
4. Click Save

This link will be sent automatically when leads express interest (on their 2nd positive reply).`
      },
      {
        title: 'Pro Tips',
        content: `Best Practices:
• Keep meetings short (15-30 min)
• Set buffer time between meetings
• Limit availability (not all day)
• Add questions to qualify leads

Alternative tools that work:
• Cal.com (open source)
• SavvyCal
• TidyCal (one-time payment)

Just paste any booking link - doesn't have to be Calendly.`
      }
    ]
  },
  apollo: {
    title: 'Apollo.io Setup Guide',
    subtitle: 'Advanced Lead Enrichment',
    sections: [
      {
        title: 'What is Apollo.io?',
        content: `Apollo.io provides deeper company intelligence:
• Company size & revenue
• Industry classification
• Decision-maker contacts
• LinkedIn profiles
• Direct phone numbers

It's more comprehensive than Hunter but requires People API access for full functionality.`
      },
      {
        title: 'Step 1: Create Account',
        content: `1. Go to apollo.io
2. Click "Sign Up Free"
3. Register with email or Google
4. Complete onboarding questions`
      },
      {
        title: 'Step 2: Get API Key',
        content: `1. Log into Apollo.io
2. Click Settings (gear icon)
3. Go to Integrations → API
4. Or direct link: app.apollo.io/#/settings/integrations/api
5. Generate and copy your API key`
      },
      {
        title: 'Step 3: Add to AutoBookd',
        content: `1. Go to Settings in AutoBookd
2. Scroll to "API Keys" section
3. Paste in "Apollo.io API Key" field
4. Select "Apollo" as Enrichment Provider
5. Click Save`
      },
      {
        title: 'Free Tier & Limitations',
        content: `Free Tier:
• 50 credits/month
• Organization enrichment: ✓ Works
• People search: ✗ Often returns 403 Forbidden

The free tier typically only has access to Organization API, not People API (which finds emails).

If you see "403 Forbidden" in logs, you need to:
• Upgrade Apollo plan, OR
• Switch to Hunter.io for email finding`
      },
      {
        title: 'Apollo vs Hunter',
        content: `Use Apollo when:
• You need company revenue/size data
• You're targeting enterprise companies
• You want LinkedIn profiles

Use Hunter when:
• You primarily need email addresses
• You're targeting small businesses
• You want simpler, reliable email finding

Recommendation: Most users do better with Hunter for email finding.`
      }
    ]
  },
  stripe: {
    title: 'Stripe Setup Guide',
    subtitle: 'Subscription Billing (For SaaS Operators)',
    sections: [
      {
        title: 'What is Stripe for?',
        content: `If you're running AutoBookd as a SaaS for clients, Stripe handles:
• Monthly subscription billing
• Free trial management
• Payment processing
• Customer portal (cancel/update)

Note: If you're using AutoBookd for yourself only, you can skip Stripe setup.`
      },
      {
        title: 'Step 1: Create Account',
        content: `1. Go to stripe.com
2. Click "Start now"
3. Complete business verification
4. Add bank account for payouts`
      },
      {
        title: 'Step 2: Create Product & Price',
        content: `1. Go to Products → Add Product
2. Create your subscription:
   • Name: "AutoBookd Pro" (or your branding)
   • Price: $29.99/month (or your price)
   • Billing: Recurring - Monthly
3. Save and copy the Price ID (starts with "price_")`
      },
      {
        title: 'Step 3: Get API Keys',
        content: `1. Go to Developers → API Keys
2. Copy both keys:
   • Publishable key (pk_live_...)
   • Secret key (sk_live_...)

For testing, use test keys (pk_test_..., sk_test_...)`
      },
      {
        title: 'Step 4: Set Up Webhook',
        content: `1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL:
   https://YOUR-BACKEND-URL/api/stripe/webhook
4. Select events:
   ☑ checkout.session.completed
   ☑ customer.subscription.updated
   ☑ customer.subscription.deleted
5. Copy the Webhook Signing Secret (whsec_...)`
      },
      {
        title: 'Step 5: Add to AutoBookd',
        content: `Add these to your backend environment variables:

STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...`
      },
      {
        title: 'Testing',
        content: `Test card numbers:
• Success: 4242 4242 4242 4242
• Decline: 4000 0000 0000 0002
• Requires auth: 4000 0025 0000 3155

Use any future expiry date and any 3-digit CVC.`
      }
    ]
  },
  autoreply: {
    title: 'Auto-Reply Setup Guide',
    subtitle: 'Configure inbound email handling to automatically respond to leads',
    sections: [
      {
        title: 'Overview',
        content: `Auto-Reply lets AutoBookd automatically:
• Receive and read incoming email replies
• Classify intent (interested, question, not interested)
• Send intelligent follow-up responses
• Update lead status automatically
• Send your calendar link on the 2nd positive reply

This requires setting up a subdomain for receiving replies.`
      },
      {
        title: 'Step 1: Choose Your Reply Subdomain',
        content: `Create a subdomain dedicated to receiving replies. Examples:
• replies.yourdomain.com
• inbox.yourdomain.com  
• mail.yourdomain.com

Using a subdomain keeps automated replies separate from your main business email.`
      },
      {
        title: 'Step 2: Add MX Record in Your DNS Provider',
        content: `Log into your DNS provider (GoDaddy, Cloudflare, Namecheap, etc.) and add an MX record:

┌─────────────────────────────────────────────────────┐
│  Type:     MX                                       │
│  Name:     replies  (or your chosen subdomain)      │
│  Value:    inbound-smtp.resend.com                  │
│  Priority: 10                                       │
│  TTL:      1 Hour (or 3600)                         │
└─────────────────────────────────────────────────────┘

Common DNS Providers:
• GoDaddy: My Products → DNS → Add Record
• Cloudflare: DNS → Records → Add Record
• Namecheap: Domain List → Manage → Advanced DNS
• Google Domains: DNS → Custom Records

Wait 15-30 minutes for DNS propagation.`
      },
      {
        title: 'Step 3: Add Subdomain to Resend',
        content: `1. Log into resend.com
2. Go to Domains → Add Domain
3. Enter your full subdomain (e.g., replies.yourdomain.com)
4. Click "Add"
5. Toggle ON "Enable Receiving" for this domain
6. Resend will verify your MX record automatically`
      },
      {
        title: 'Step 4: Create Inbound Webhook in Resend',
        content: `1. In Resend, go to Webhooks → Add Webhook
2. Configure the webhook:

┌─────────────────────────────────────────────────────┐
│  Endpoint URL:                                      │
│  https://YOUR-BACKEND-URL/api/webhooks/email/reply  │
│                                                     │
│  Events to subscribe:                               │
│  ☑ email.received                                   │
└─────────────────────────────────────────────────────┘

Replace YOUR-BACKEND-URL with your actual Railway backend URL.
Example: https://autobookd-production.up.railway.app

3. Click "Add Webhook"`
      },
      {
        title: 'Step 5: Configure AutoBookd Settings',
        content: `1. Go to Settings in AutoBookd
2. Scroll to the "System Settings" section
3. Configure:
   • Reply Domain: replies.yourdomain.com
   • AI Auto-Reply: Toggle ON
4. Make sure you also have configured:
   • From Email (your sending email)
   • Calendly Link (for booking meetings)
5. Save settings`
      },
      {
        title: 'How It Works',
        content: `Once configured, the flow is:

1. You send outreach → Lead receives email
2. Lead replies → Goes to replies.yourdomain.com
3. Resend receives it → Sends webhook to AutoBookd
4. AutoBookd AI classifies the reply:
   • Positive → Lead marked "Qualified"
   • Negative → Lead marked "Disqualified", sequence stopped
   • Neutral → Lead marked "Engaged"
5. If Auto-Reply is ON:
   • 1st positive reply: AI thanks them, asks for availability
   • 2nd positive reply: AI sends your calendar booking link
6. All messages saved to Conversations`
      },
      {
        title: 'Troubleshooting',
        content: `Not receiving replies?
• Check MX record is correct (use mxtoolbox.com)
• Verify domain is "Receiving Enabled" in Resend
• Check webhook URL is correct and accessible
• Look at Resend webhook logs for errors

Replies not being processed?
• Check your OpenAI API key is valid
• Ensure Auto-Reply is enabled in Settings
• Check Railway logs for errors`
      }
    ]
  }
};

const setupSteps = [
  {
    id: 'serpapi',
    title: 'SerpAPI',
    subtitle: 'Lead Discovery',
    icon: Search,
    color: 'text-blue-400',
    bg: 'bg-blue-900/30',
    description: 'Find leads from Google Maps based on keywords and locations.',
    freeCredits: '100 searches/month free',
    instructions: [
      'Go to serpapi.com and create a free account',
      'Navigate to your Dashboard',
      'Copy your API key',
      'Paste in Settings → API Keys → SerpAPI'
    ],
    link: 'https://serpapi.com/manage-api-key',
    required: true,
    hasDetailedGuide: true
  },
  {
    id: 'hunter',
    title: 'Hunter.io',
    subtitle: 'Email Finder',
    icon: Mail,
    color: 'text-orange-400',
    bg: 'bg-orange-900/30',
    description: 'Find verified email addresses for discovered leads.',
    freeCredits: '25 searches/month free',
    instructions: [
      'Go to hunter.io and sign up for free',
      'Navigate to API settings',
      'Copy your API key',
      'Paste in Settings → API Keys → Hunter.io'
    ],
    link: 'https://hunter.io/api-keys',
    required: true,
    hasDetailedGuide: true
  },
  {
    id: 'openai',
    title: 'OpenAI',
    subtitle: 'AI Research & Emails',
    icon: Brain,
    color: 'text-emerald-400',
    bg: 'bg-emerald-900/30',
    description: 'Powers AI research and personalized email generation.',
    freeCredits: 'Pay-as-you-go (~$0.03/lead)',
    instructions: [
      'Go to platform.openai.com',
      'Add payment method in Billing',
      'Navigate to API Keys section',
      'Create a new secret key',
      'Paste in Settings → API Keys → OpenAI'
    ],
    link: 'https://platform.openai.com/api-keys',
    required: true,
    hasDetailedGuide: true
  },
  {
    id: 'resend',
    title: 'Resend',
    subtitle: 'Email Sending',
    icon: Mail,
    color: 'text-purple-400',
    bg: 'bg-purple-900/30',
    description: 'Send outreach emails with tracking from your domain.',
    freeCredits: '3,000 emails/month free',
    instructions: [
      'Go to resend.com and create an account',
      'Add and verify your domain (DNS records)',
      'Get your API key from Dashboard',
      'Paste in Settings → API Keys → Resend'
    ],
    link: 'https://resend.com/api-keys',
    required: true,
    hasDetailedGuide: true
  },
  {
    id: 'calendly',
    title: 'Calendly',
    subtitle: 'Meeting Booking',
    icon: Calendar,
    color: 'text-cyan-400',
    bg: 'bg-cyan-900/30',
    description: 'Let prospects book meetings directly from emails.',
    freeCredits: 'Free tier available',
    instructions: [
      'Go to calendly.com and sign up',
      'Create your event type (e.g., 15min call)',
      'Copy your scheduling link',
      'Paste in Settings → General → Calendly Link'
    ],
    link: 'https://calendly.com/event_types',
    required: false,
    hasDetailedGuide: true
  },
  {
    id: 'apollo',
    title: 'Apollo.io',
    subtitle: 'Lead Enrichment (Optional)',
    icon: Database,
    color: 'text-amber-400',
    bg: 'bg-amber-900/30',
    description: 'Get richer company data. Note: Free tier has API limitations.',
    freeCredits: '50 credits/month free',
    instructions: [
      'Go to apollo.io and create an account',
      'Navigate to Settings → Integrations → API',
      'Generate your API key',
      'Paste in Settings → API Keys → Apollo.io'
    ],
    link: 'https://app.apollo.io/#/settings/integrations/api',
    required: false,
    hasDetailedGuide: true
  },
  {
    id: 'stripe',
    title: 'Stripe',
    subtitle: 'Subscription Billing (SaaS)',
    icon: CreditCard,
    color: 'text-indigo-400',
    bg: 'bg-indigo-900/30',
    description: 'Accept payments if running AutoBookd as a SaaS.',
    freeCredits: '2.9% + 30¢ per transaction',
    instructions: [
      'Go to stripe.com and create account',
      'Create a Product with monthly price',
      'Get API keys from Developers section',
      'Set up webhook for subscription events',
      'Add keys to environment variables'
    ],
    link: 'https://dashboard.stripe.com/apikeys',
    required: false,
    hasDetailedGuide: true
  },
  {
    id: 'autoreply',
    title: 'Auto-Reply Setup',
    subtitle: 'Inbound Email Handling',
    icon: MessageSquare,
    color: 'text-pink-400',
    bg: 'bg-pink-900/30',
    description: 'Automatically receive, classify, and respond to lead replies.',
    freeCredits: 'Included with Resend',
    instructions: [
      'Create a subdomain (e.g., replies.yourdomain.com)',
      'Add MX record pointing to inbound-smtp.resend.com',
      'Add subdomain to Resend with "Receiving" enabled',
      'Create webhook in Resend → your backend URL',
      'Enable Auto-Reply in Settings'
    ],
    link: 'https://resend.com/docs/dashboard/webhooks/introduction',
    required: false,
    hasDetailedGuide: true
  }
];

export default function SetupGuide({ isOpen, onClose, isModal = true }) {
  const navigate = useNavigate();
  const [expandedStep, setExpandedStep] = useState(null);
  const [activeGuide, setActiveGuide] = useState(null);
  const [copied, setCopied] = useState(null);

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-slate-800">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">AutoBookd Setup Guide</span>
        </div>
        <p className="text-slate-400 text-sm">Everything you need to start automating lead generation</p>
      </div>

      {/* Quick Start */}
      <Card className="bg-emerald-900/20 border-emerald-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-400">Quick Start (Minimum Required)</p>
              <p className="text-sm text-slate-400 mt-1">
                To get started, you only need: <strong className="text-white">SerpAPI</strong>, <strong className="text-white">Hunter.io</strong>, <strong className="text-white">OpenAI</strong>, and <strong className="text-white">Resend</strong>. 
                Everything else is optional.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Steps */}
      <div className="space-y-3">
        {setupSteps.map((step) => {
          const Icon = step.icon;
          const isExpanded = expandedStep === step.id;
          
          return (
            <Card 
              key={step.id} 
              className={`bg-slate-900 border-slate-800 cursor-pointer transition-all ${isExpanded ? 'ring-1 ring-red-500/50' : ''}`}
              onClick={() => setExpandedStep(isExpanded ? null : step.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${step.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${step.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{step.title}</span>
                        {step.required ? (
                          <Badge className="bg-red-900/30 text-red-400 border-red-800 text-xs">Required</Badge>
                        ) : (
                          <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-xs">Optional</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-400">{step.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 hidden sm:inline">{step.freeCredits}</span>
                    <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm text-slate-300 mb-4">{step.description}</p>
                    <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-medium text-slate-400 mb-2">Quick Setup:</p>
                      <ol className="space-y-1">
                        {step.instructions.map((inst, i) => (
                          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                              {i + 1}
                            </span>
                            <span>{inst}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <a href={step.link} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px]">
                        <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-300">
                          <ExternalLink className="w-3 h-3 mr-2" />
                          Open {step.title}
                        </Button>
                      </a>
                      {step.hasDetailedGuide && (
                        <Button 
                          size="sm" 
                          className="flex-1 min-w-[140px] bg-red-600 hover:bg-red-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveGuide(step.id);
                          }}
                        >
                          <ArrowRight className="w-3 h-3 mr-2" />
                          View Detailed Guide
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-slate-800">
        <p className="text-sm text-slate-500">
          Need help? Contact support or check our documentation.
        </p>
        <Button 
          className="mt-3 bg-red-600 hover:bg-red-700"
          onClick={() => {
            if (onClose) onClose();
            navigate('/settings');
          }}
        >
          Go to Settings
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Detailed Guide Dialog
  const DetailedGuideDialog = () => {
    const guide = activeGuide ? detailedGuides[activeGuide] : null;
    if (!guide) return null;
    
    return (
      <Dialog open={!!activeGuide} onOpenChange={() => setActiveGuide(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">{guide.title}</DialogTitle>
            <p className="text-slate-400 text-sm">{guide.subtitle}</p>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-6">
              {guide.sections.map((section, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    {section.title}
                  </h3>
                  <div className="text-sm text-slate-300 whitespace-pre-wrap pl-8 bg-slate-800/30 rounded-lg p-3">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <Button variant="outline" onClick={() => setActiveGuide(null)} className="border-slate-700 text-slate-300">
              Close
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setActiveGuide(null);
                if (onClose) onClose();
                navigate('/settings');
              }}
            >
              Go to Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (!isModal) {
    return (
      <>
        {content}
        <DetailedGuideDialog />
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-slate-900 border-slate-800 p-0">
          <ScrollArea className="max-h-[85vh] p-6">
            {content}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <DetailedGuideDialog />
    </>
  );
}
