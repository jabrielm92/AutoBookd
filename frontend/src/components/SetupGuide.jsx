import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, ChevronRight, ChevronLeft, CheckCircle, ExternalLink, 
  Search, Mail, Database, Calendar, Brain, Copy, Check,
  MessageSquare, Globe, ArrowRight, X
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
    required: true
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
    required: true
  },
  {
    id: 'openai',
    title: 'OpenAI',
    subtitle: 'AI Research & Emails',
    icon: Brain,
    color: 'text-emerald-400',
    bg: 'bg-emerald-900/30',
    description: 'Powers AI research and personalized email generation.',
    freeCredits: 'Pay-as-you-go (~$0.05/lead)',
    instructions: [
      'Go to platform.openai.com',
      'Navigate to API Keys section',
      'Create a new secret key',
      'Paste in Settings → API Keys → OpenAI'
    ],
    link: 'https://platform.openai.com/api-keys',
    required: true
  },
  {
    id: 'resend',
    title: 'Resend',
    subtitle: 'Email Sending',
    icon: Mail,
    color: 'text-purple-400',
    bg: 'bg-purple-900/30',
    description: 'Send outreach emails with tracking.',
    freeCredits: '3,000 emails/month free',
    instructions: [
      'Go to resend.com and create an account',
      'Add and verify your domain',
      'Get your API key from Dashboard',
      'Paste in Settings → API Keys → Resend'
    ],
    link: 'https://resend.com/api-keys',
    required: true
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
      'Create your event type (e.g., 30min call)',
      'Copy your scheduling link',
      'Paste in Settings → General → Calendly Link'
    ],
    link: 'https://calendly.com/event_types',
    required: false
  },
  {
    id: 'apollo',
    title: 'Apollo.io',
    subtitle: 'Lead Enrichment (Optional)',
    icon: Database,
    color: 'text-amber-400',
    bg: 'bg-amber-900/30',
    description: 'Get richer company data and decision-maker contacts.',
    freeCredits: '50 credits/month free',
    instructions: [
      'Go to apollo.io and create an account',
      'Navigate to Settings → Integrations → API',
      'Generate your API key',
      'Paste in Settings → API Keys → Apollo.io'
    ],
    link: 'https://app.apollo.io/#/settings/integrations/api',
    required: false
  },
  {
    id: 'autoreply',
    title: 'Auto-Reply Setup',
    subtitle: 'Inbound Email Handling',
    icon: MessageSquare,
    color: 'text-pink-400',
    bg: 'bg-pink-900/30',
    description: 'Let AI read and respond to incoming replies automatically.',
    freeCredits: 'Included with Resend',
    instructions: [
      'Set up a subdomain for replies (e.g., replies.yourdomain.com)',
      'Configure MX records pointing to Resend',
      'Add inbound webhook in Resend dashboard',
      'Enable Auto-Reply in Settings → System',
      'See detailed guide below'
    ],
    link: 'https://resend.com/docs/dashboard/webhooks/introduction',
    required: false,
    hasDetailedGuide: true
  }
];

const autoReplyGuide = {
  title: 'Auto-Reply Setup Guide',
  subtitle: 'Configure inbound email handling with Resend & GoDaddy',
  sections: [
    {
      title: 'Step 1: Choose Your Reply Subdomain',
      content: `Decide on a subdomain for receiving replies. Examples:
• replies.yourdomain.com
• inbox.yourdomain.com
• mail.yourdomain.com

This keeps replies separate from your main domain email.`
    },
    {
      title: 'Step 2: Add Domain to Resend',
      content: `1. Log into resend.com
2. Go to Domains → Add Domain
3. Enter your subdomain (e.g., replies.yourdomain.com)
4. Resend will show you DNS records to add`
    },
    {
      title: 'Step 3: Configure DNS in GoDaddy',
      content: `1. Log into GoDaddy → My Products → DNS
2. Add these records for your subdomain:

MX Record:
• Host: replies (or your subdomain)
• Points to: feedback-smtp.us-east-1.amazonses.com
• Priority: 10
• TTL: 1 hour

TXT Record (SPF):
• Host: replies
• Value: v=spf1 include:amazonses.com ~all
• TTL: 1 hour

Wait 15-30 minutes for DNS propagation.`
    },
    {
      title: 'Step 4: Verify Domain in Resend',
      content: `1. Go back to Resend → Domains
2. Click "Verify" next to your subdomain
3. Resend will check your DNS records
4. Status should change to "Verified"`
    },
    {
      title: 'Step 5: Set Up Inbound Webhook',
      content: `1. In Resend, go to Webhooks → Add Webhook
2. Enter your webhook URL:
   https://your-backend-url/api/webhooks/resend/inbound
3. Select event: "email.received"
4. Save the webhook`
    },
    {
      title: 'Step 6: Configure AutoBookd',
      content: `1. Go to Settings → System tab
2. Enable "AI Auto-Reply" toggle
3. Enter your reply domain (e.g., replies.yourdomain.com)
4. Save settings

Now when leads reply, AI will:
• Classify the intent (interested, question, not interested)
• Generate an appropriate response
• Update the lead status automatically`
    }
  ]
};

export default function SetupGuide({ isOpen, onClose, isModal = true }) {
  const navigate = useNavigate();
  const [expandedStep, setExpandedStep] = useState(null);
  const [showAutoReplyGuide, setShowAutoReplyGuide] = useState(false);
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
                To get started, you only need: <strong className="text-white">SerpAPI</strong>, <strong className="text-white">OpenAI</strong>, and <strong className="text-white">Resend</strong>. 
                Hunter.io is needed for email finding. Everything else is optional.
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
                    <span className="text-xs text-slate-500">{step.freeCredits}</span>
                    <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <p className="text-sm text-slate-300 mb-4">{step.description}</p>
                    <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-medium text-slate-400 mb-2">Setup Steps:</p>
                      <ol className="space-y-1">
                        {step.instructions.map((inst, i) => (
                          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                              {i + 1}
                            </span>
                            {inst}
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open {step.title}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {step.hasDetailedGuide && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAutoReplyGuide(true);
                          }}
                          className="border-slate-700 text-slate-300 hover:text-white text-xs"
                        >
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

      {/* Auto-Reply Detailed Guide Modal */}
      <Dialog open={showAutoReplyGuide} onOpenChange={setShowAutoReplyGuide}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-pink-400" />
              {autoReplyGuide.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              <p className="text-slate-400">{autoReplyGuide.subtitle}</p>
              
              {autoReplyGuide.sections.map((section, i) => (
                <div key={i} className="space-y-2">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-sm">
                      {i + 1}
                    </span>
                    {section.title}
                  </h3>
                  <div className="bg-slate-800/50 rounded-lg p-4 ml-8">
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">{section.content}</pre>
                  </div>
                </div>
              ))}

              {/* Webhook URL to copy */}
              <div className="bg-slate-800 rounded-lg p-4 ml-8">
                <p className="text-xs text-slate-400 mb-2">Your Webhook URL:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-emerald-400 bg-slate-900 px-3 py-2 rounded">
                    https://your-backend-url/api/webhooks/resend/inbound
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyText('https://your-backend-url/api/webhooks/resend/inbound', 'webhook')}
                    className="text-slate-400"
                  >
                    {copied === 'webhook' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Configure API keys in Settings → API Keys tab
        </p>
        <Button
          onClick={() => {
            if (isModal && onClose) onClose();
            navigate('/dashboard/settings');
          }}
          className="bg-red-600 hover:bg-red-700"
        >
          Go to Settings
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl max-h-[85vh]">
        <ScrollArea className="max-h-[75vh] pr-4">
          {content}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
