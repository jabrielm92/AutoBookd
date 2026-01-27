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
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

const features = [
  {
    icon: Target,
    title: "AI-Powered Lead Discovery",
    description: "Automatically find high-quality leads from Google Maps. Our AI scores and qualifies them instantly."
  },
  {
    icon: Mail,
    title: "Hyper-Personalized Outreach",
    description: "Generate context-aware emails that mention specific pain points discovered from their website."
  },
  {
    icon: Calendar,
    title: "Auto-Book Meetings",
    description: "AI classifies replies and automatically offers calendar links to qualified prospects."
  },
  {
    icon: BarChart3,
    title: "Full-Funnel Analytics",
    description: "Track every stage from scrape to booking. See what's working and optimize in real-time."
  }
];

const stats = [
  { value: "10x", label: "Faster Lead Gen" },
  { value: "85%", label: "Email Open Rate" },
  { value: "40%", label: "Reply Rate" },
  { value: "24/7", label: "Autonomous" }
];

const faqs = [
  {
    q: "How does AutoBookd find leads?",
    a: "AutoBookd uses SerpAPI to search Google Maps for businesses matching your criteria. It then enriches these leads with email data from Hunter.io and Apollo, researches their websites with AI, and scores them based on their potential."
  },
  {
    q: "What makes the emails so effective?",
    a: "Our AI analyzes each prospect's website to identify specific pain points, services, and opportunities. Every email is uniquely crafted with genuine personalization - not just mail merge tokens."
  },
  {
    q: "Do I need technical skills to use AutoBookd?",
    a: "Not at all! Our onboarding wizard walks you through setting up your API keys step by step. Once configured, the system runs autonomously - just review and approve."
  },
  {
    q: "What's included in the free trial?",
    a: "Full access to all features for 24 hours. You can scrape leads, send emails, and book meetings - everything the paid plan offers."
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. Cancel anytime from your account settings. No questions asked, no hidden fees."
  }
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
              <a href="#pricing" className="text-slate-300 hover:text-white transition">Pricing</a>
              <a href="#faq" className="text-slate-300 hover:text-white transition">FAQ</a>
              <a href="#contact" className="text-slate-300 hover:text-white transition">Contact</a>
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
            AI-Powered Lead Generation
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Find Quality Leads
            <span className="block bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Autonomously
            </span>
          </h1>
          <p className="text-xl text-slate-200 max-w-3xl mx-auto mb-10">
            AutoBookd discovers and qualifies leads with AI, crafts personalized outreach, 
            and fills your pipeline - in just a few clicks.
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
          <p className="text-slate-500 text-sm mt-4">No credit card required • Cancel anytime</p>
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

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need to Scale Outreach</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              A complete autonomous system that handles lead generation, qualification, outreach, and booking.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-red-900/20 hover:border-red-500/30 transition group"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                  <feature.icon className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How AutoBookd Works</h2>
            <p className="text-slate-400 text-lg">Four simple steps to fill your calendar</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Define Target", desc: "Set your ideal customer criteria and search locations" },
              { step: "2", title: "AI Discovers", desc: "Our AI scrapes, enriches, and researches leads automatically" },
              { step: "3", title: "Personalized Outreach", desc: "Context-aware emails sent at optimal times" },
              { step: "4", title: "Meetings Booked", desc: "AI classifies replies and schedules qualified calls" }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-200 text-lg">Start free, scale when ready</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 rounded-3xl border border-red-900/30 p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <div className="text-red-400 font-medium mb-2">AutoBookd Pro</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white">$29.99</span>
                  <span className="text-slate-400">/month</span>
                </div>
                <p className="text-slate-400 mt-2">24-hour free trial included</p>
              </div>
              <Button 
                size="lg"
                onClick={() => navigate('/signup')}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 px-8"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <div className="border-t border-slate-800 mt-8 pt-8">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "Automated lead discovery",
                  "AI-powered website research",
                  "Hyper-personalized emails",
                  "4-step email sequences",
                  "Auto reply classification",
                  "Calendar booking integration",
                  "Full analytics dashboard",
                  "Priority support"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 bg-slate-900/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div 
                key={i}
                className="bg-slate-900 rounded-xl border border-red-900/20 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-medium text-white">{faq.q}</span>
                  <ChevronDown className={cn(
                    "w-5 h-5 text-slate-400 transition-transform",
                    openFaq === i && "rotate-180"
                  )} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-slate-400">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 px-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Get in Touch</h2>
            <p className="text-slate-400">Have questions? We'd love to hear from you.</p>
          </div>
          <form onSubmit={handleContact} className="space-y-6">
            <div>
              <Input
                placeholder="Your Name"
                value={contactForm.name}
                onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Your Email"
                value={contactForm.email}
                onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <Textarea
                placeholder="Your Message"
                rows={5}
                value={contactForm.message}
                onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
              />
            </div>
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

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-red-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">AutoBookd</span>
            </div>
            <div className="flex items-center gap-6 text-slate-400 text-sm">
              <Link to="/terms" className="hover:text-white transition">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link>
              <a href="https://arisolutionsinc.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition flex items-center gap-1">
                ARI Solutions Inc.
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div className="text-center text-slate-500 text-sm mt-8">
            © {new Date().getFullYear()} ARI Solutions Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
