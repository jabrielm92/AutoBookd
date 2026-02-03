import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Zap, 
  Target, 
  Mail, 
  Calendar, 
  BarChart3, 
  CheckCircle,
  ArrowRight,
  Star,
  Shield,
  Clock,
  Users,
  TrendingUp,
  ChevronDown,
  Send,
  ExternalLink,
  MapPin,
  Phone,
  Brain,
  Search,
  Settings,
  MessageSquare,
  Globe,
  Sparkles,
  Play,
  Pause,
  Edit3,
  Filter,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

const coreFeatures = [
  {
    icon: Search,
    title: "Find Leads in Any City",
    description: "Search any niche in any location. Dentists in Miami? Roofers in Chicago? HVAC in Phoenix? Just type your keyword and city - AutoBookd scrapes Google Maps and finds them all.",
    details: ["Unlimited location targeting", "Any business category", "Real-time Google Maps data", "Automatic duplicate removal"]
  },
  {
    icon: Database,
    title: "Complete Contact Data",
    description: "Get more than just emails. AutoBookd enriches every lead with phone numbers, addresses, websites, ratings, and review counts - everything you need for multi-channel outreach.",
    details: ["Verified email addresses", "Direct phone numbers", "Business addresses", "Google ratings & reviews"]
  },
  {
    icon: Brain,
    title: "AI Research & Scoring",
    description: "Our AI visits each lead's website, analyzes their business, identifies pain points, and scores them 0-100. Focus on hot leads, skip the cold ones.",
    details: ["Website content analysis", "Pain point identification", "Intelligent lead scoring", "Personalization hooks extracted"]
  },
  {
    icon: Mail,
    title: "Hyper-Personalized Emails",
    description: "No more templates. AI writes unique emails for each lead, referencing their specific services, location, and business challenges. Every email feels hand-crafted.",
    details: ["GPT-4o powered writing", "Custom AI instructions", "Multi-email sequences", "Automatic follow-ups"]
  },
  {
    icon: Phone,
    title: "Cold Call Ready",
    description: "Not just emails - get direct phone numbers for leads. Use our data to power your cold calling alongside email outreach for maximum reach.",
    details: ["Phone numbers included", "Business hours data", "Call tracking ready", "Export to any dialer"]
  },
  {
    icon: Calendar,
    title: "Auto-Book Meetings",
    description: "AI reads replies, identifies interest, and automatically offers your Calendly link. Wake up to booked meetings without lifting a finger.",
    details: ["Calendly integration", "Reply classification", "Auto-response AI", "Meeting confirmations"]
  }
];

const automationSteps = [
  { step: "1", title: "Set Your Target", desc: "Define your ideal customer: industry, location, and criteria" },
  { step: "2", title: "AI Discovers", desc: "AutoBookd scrapes leads and enriches with contact data" },
  { step: "3", title: "AI Researches", desc: "Each lead's website is analyzed for personalization" },
  { step: "4", title: "AI Writes", desc: "Unique, personalized emails crafted for each prospect" },
  { step: "5", title: "You Review", desc: "Approve emails or let them send automatically" },
  { step: "6", title: "Meetings Booked", desc: "AI handles replies and books calls on your calendar" }
];

const useCases = [
  { icon: "🏠", title: "Home Services", examples: "Roofers, HVAC, Plumbers, Electricians, Landscapers" },
  { icon: "⚖️", title: "Professional Services", examples: "Lawyers, Accountants, Consultants, Insurance Agents" },
  { icon: "🏥", title: "Healthcare", examples: "Dentists, Chiropractors, Med Spas, Therapists" },
  { icon: "🏗️", title: "Construction", examples: "Contractors, Builders, Architects, Interior Designers" },
  { icon: "🚗", title: "Automotive", examples: "Auto Shops, Dealers, Detailers, Mechanics" },
  { icon: "🍽️", title: "Hospitality", examples: "Restaurants, Caterers, Event Venues, Hotels" }
];

const stats = [
  { value: "10x", label: "Faster Than Manual" },
  { value: "85%", label: "Email Open Rate" },
  { value: "500+", label: "Leads per Day" },
  { value: "24/7", label: "Fully Autonomous" }
];

const faqs = [
  {
    q: "How does AutoBookd find leads?",
    a: "AutoBookd uses Google Maps data to find businesses matching your criteria in any city. It then enriches each lead with verified email addresses, phone numbers, and business details from multiple data sources including Hunter.io and Apollo."
  },
  {
    q: "Can I use this for cold calling too?",
    a: "Absolutely! Every lead includes phone numbers when available. You can export lead data to your favorite dialer or CRM, or simply call directly from the dashboard. AutoBookd is built for multi-channel outreach."
  },
  {
    q: "What makes the emails so effective?",
    a: "Our AI analyzes each prospect's actual website to find specific pain points, services they offer, and opportunities. Then GPT-4o writes completely unique emails - not templates with mail merge. Plus, you can add custom AI instructions to match your voice and style."
  },
  {
    q: "Do I have to send emails automatically?",
    a: "Nope! You control everything. Turn off auto-send and emails become drafts you can review, edit, and send manually. Perfect for high-value prospects where you want that personal touch."
  },
  {
    q: "What cities/industries can I target?",
    a: "Any city in the US (and most international locations). Any industry that shows up on Google Maps. Roofers in Dallas, dentists in NYC, consultants in London - if they're on Google, we can find them."
  },
  {
    q: "Do I need technical skills?",
    a: "Not at all. Our setup wizard walks you through connecting your API keys (free tiers available for all). Once configured, just point and click - the AI handles everything else."
  },
  {
    q: "What's included in the free trial?",
    a: "Full access to everything for 24 hours. Scrape leads, enrich data, generate emails, book meetings - the complete platform with no limitations."
  }
];

const pricingFeatures = [
  "Unlimited lead discovery",
  "Email + phone enrichment",
  "AI website research",
  "GPT-4o personalized emails",
  "Multi-email sequences",
  "Auto follow-ups",
  "Reply classification",
  "Calendly integration",
  "Full analytics dashboard",
  "Export to CSV/CRM",
  "Custom AI instructions",
  "Priority support"
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleContact = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error('Please fill all fields');
      return;
    }
    setSending(true);
    try {
      await api.post('/contact', contactForm);
      toast.success('Message sent! We\'ll get back to you soon.');
      setContactForm({ name: '', email: '', message: '' });
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-red-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AutoBookd</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-300 hover:text-white transition">Features</a>
              <a href="#how-it-works" className="text-slate-300 hover:text-white transition">How It Works</a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition">Pricing</a>
              <a href="#faq" className="text-slate-300 hover:text-white transition">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')} className="text-slate-300 hover:text-white">
                Login
              </Button>
              <Button onClick={() => navigate('/signup')} className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600">
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-8">
            <Zap className="w-4 h-4" />
            AI-Powered Lead Generation & Outreach Automation
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Find Leads. Send Emails.
            <span className="block bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent pb-4 mb-2" style={{lineHeight: '1.3'}}>
              Book Meetings.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-200 max-w-4xl mx-auto mb-4">
            In just a few clicks.
          </p>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto mb-10">
            AutoBookd discovers leads in any city, enriches them with emails AND phone numbers, 
            writes hyper-personalized outreach with AI, and books meetings on autopilot. 
            The complete lead generation machine for entrepreneurs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-lg px-8 py-6"
            >
              Start Free 24-Hour Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          <p className="text-slate-500 text-sm mt-4">Cancel anytime • No credit card for trial</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-red-900/20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-slate-400 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Stop Wasting Hours on Manual Prospecting
              </h2>
              <div className="space-y-4 text-slate-300">
                <p className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✗</span>
                  Manually searching Google Maps for leads
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✗</span>
                  Copy-pasting business info into spreadsheets
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✗</span>
                  Hunting for email addresses one by one
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✗</span>
                  Writing the same email templates over and over
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✗</span>
                  Missing follow-ups and losing deals
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 border border-red-900/30">
              <h3 className="text-2xl font-bold text-white mb-6">With AutoBookd:</h3>
              <div className="space-y-4 text-slate-300">
                <p className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Scrape 500+ leads per day automatically
                </p>
                <p className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Get emails AND phone numbers enriched
                </p>
                <p className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  AI researches each lead's website
                </p>
                <p className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Every email is uniquely personalized
                </p>
                <p className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Follow-ups sent automatically
                </p>
                <p className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Meetings booked while you sleep
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-24 px-4 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Complete Lead Generation Suite</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Everything you need to find leads, reach out, and book meetings - all in one platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreFeatures.map((feature, i) => (
              <div 
                key={i}
                className="p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-red-900/20 hover:border-red-500/30 transition group"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                  <feature.icon className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-500">
                      <CheckCircle className="w-4 h-4 text-red-400/60" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How AutoBookd Works</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Set it up once, let it run forever. Here's the complete automation flow.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {automationSteps.map((step, i) => (
              <div key={i} className="relative p-6 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center font-bold text-white">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-white mt-4 mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/20 text-center">
            <p className="text-lg text-slate-300">
              <Sparkles className="w-5 h-5 inline mr-2 text-amber-400" />
              <strong className="text-white">Full Control Mode:</strong> Turn off auto-send and review every email before it goes out. 
              Edit, personalize further, or send with one click.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Works for Any Industry</h2>
            <p className="text-slate-400">If they're on Google Maps, AutoBookd can find them.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {useCases.map((useCase, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center hover:border-red-500/30 transition">
                <div className="text-3xl mb-2">{useCase.icon}</div>
                <h3 className="font-semibold text-white text-sm mb-1">{useCase.title}</h3>
                <p className="text-xs text-slate-500">{useCase.examples}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400">One plan. Everything included. No hidden fees.</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900 via-red-950/20 to-slate-900 rounded-3xl p-8 md:p-12 border border-red-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-red-500 to-orange-500 text-white text-sm font-semibold px-6 py-2 rounded-bl-xl">
              MOST POPULAR
            </div>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">AutoBookd Pro</h3>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-white">$29.99</span>
                <span className="text-slate-400">/month</span>
              </div>
              <p className="text-slate-400 mt-2">24-hour free trial included</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {pricingFeatures.map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
            <div className="text-center">
              <Button 
                size="lg"
                onClick={() => navigate('/signup')}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-lg px-12 py-6"
              >
                Start Your Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 bg-slate-900/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div 
                key={i}
                className="rounded-xl border border-slate-800 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left bg-slate-900 hover:bg-slate-900/80 transition"
                >
                  <span className="font-semibold text-white pr-4">{faq.q}</span>
                  <ChevronDown className={cn(
                    "w-5 h-5 text-slate-400 transition-transform flex-shrink-0",
                    openFaq === i && "rotate-180"
                  )} />
                </button>
                {openFaq === i && (
                  <div className="p-6 pt-0 bg-slate-900">
                    <p className="text-slate-400">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Get in Touch</h2>
            <p className="text-slate-400">Have questions? We'd love to hear from you.</p>
          </div>
          <form onSubmit={handleContact} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Input
                  placeholder="Your Name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="Your Email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>
            <Textarea
              placeholder="Your Message"
              value={contactForm.message}
              onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
              className="bg-slate-900 border-slate-700 text-white min-h-[150px]"
            />
            <Button 
              type="submit" 
              disabled={sending}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600"
            >
              {sending ? 'Sending...' : 'Send Message'}
              <Send className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-red-900/30 to-orange-900/30 border-y border-red-500/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Automate Your Lead Generation?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join entrepreneurs who are booking more meetings with less effort.
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/signup')}
            className="bg-white text-slate-900 hover:bg-slate-100 text-lg px-12 py-6"
          >
            Start Free 24-Hour Trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">AutoBookd</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white transition">Terms of Service</Link>
              <a href="https://arisolutionsinc.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition flex items-center gap-1">
                ARI Solutions Inc.
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} ARI Solutions Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
