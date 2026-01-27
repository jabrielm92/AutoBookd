import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Zap, ChevronRight, ChevronLeft, CheckCircle, ExternalLink, 
  Search, Mail, Database, Calendar, Brain, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { toast } from 'sonner';

const steps = [
  {
    id: 'serpapi',
    title: 'SerpAPI',
    subtitle: 'Google Maps Lead Discovery',
    icon: Search,
    description: 'SerpAPI allows AutoBookd to search Google Maps and find potential leads based on your criteria.',
    instructions: [
      'Go to serpapi.com and create a free account',
      'Navigate to your Dashboard',
      'Copy your API key from the dashboard',
      'Paste it below'
    ],
    link: 'https://serpapi.com/manage-api-key',
    placeholder: 'Your SerpAPI key',
    fieldName: 'serpapi'
  },
  {
    id: 'hunter',
    title: 'Hunter.io',
    subtitle: 'Email Finder',
    icon: Mail,
    description: 'Hunter.io finds verified email addresses for the leads we discover.',
    instructions: [
      'Go to hunter.io and sign up for free',
      'Go to your API settings',
      'Copy your API key',
      'Paste it below'
    ],
    link: 'https://hunter.io/api-keys',
    placeholder: 'Your Hunter.io API key',
    fieldName: 'hunter'
  },
  {
    id: 'apollo',
    title: 'Apollo.io',
    subtitle: 'Lead Enrichment (Optional)',
    icon: Database,
    description: 'Apollo provides additional lead data and contact information. This is optional but recommended.',
    instructions: [
      'Go to apollo.io and create an account',
      'Navigate to Settings > Integrations > API',
      'Generate and copy your API key',
      'Paste it below'
    ],
    link: 'https://app.apollo.io/#/settings/integrations/api',
    placeholder: 'Your Apollo API key (optional)',
    fieldName: 'apollo',
    optional: true
  },
  {
    id: 'calendly',
    title: 'Calendly',
    subtitle: 'Meeting Scheduling',
    icon: Calendar,
    description: 'Your Calendly link will be included in emails so prospects can book meetings directly.',
    instructions: [
      'Go to calendly.com and sign up or log in',
      'Copy your scheduling link (e.g., calendly.com/yourname)',
      'Paste it below'
    ],
    link: 'https://calendly.com/event_types',
    placeholder: 'https://calendly.com/yourname/30min',
    fieldName: 'calendly'
  },
  {
    id: 'openai',
    title: 'OpenAI',
    subtitle: 'AI Research & Personalization',
    icon: Brain,
    description: 'OpenAI powers the AI research and email personalization features.',
    instructions: [
      'Go to platform.openai.com',
      'Navigate to API Keys section',
      'Create a new secret key',
      'Copy and paste it below'
    ],
    link: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-...',
    fieldName: 'openai'
  }
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [apiKeys, setApiKeys] = useState({
    serpapi: '',
    hunter: '',
    apollo: '',
    calendly: '',
    openai: ''
  });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      toast.success('Payment successful! Let\'s set up your account.');
    }
  }, [searchParams]);

  const handleSaveKey = async (fieldName, value) => {
    try {
      await api.put('/user/api-keys', { [fieldName]: value });
      toast.success('API key saved!');
    } catch (error) {
      toast.error('Failed to save key');
    }
  };

  const handleNext = async () => {
    const step = steps[currentStep];
    const value = apiKeys[step.fieldName];
    
    if (value && value.trim()) {
      await handleSaveKey(step.fieldName, value.trim());
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      setSaving(true);
      try {
        await api.post('/user/complete-onboarding');
        toast.success('Setup complete! Welcome to AutoBookd.');
        navigate('/dashboard');
      } catch (error) {
        toast.error('Failed to complete setup');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleNext();
    }
  };

  const handleSkipAll = async () => {
    setSaving(true);
    try {
      await api.post('/user/complete-onboarding');
      toast.info('You can set up API keys later in Settings.');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to complete setup');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AutoBookd</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Set Up Your Account</h1>
          <p className="text-slate-400">Connect your tools to start automating lead generation</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`w-3 h-3 rounded-full transition-colors ${
                i === currentStep
                  ? 'bg-red-500'
                  : i < currentStep
                  ? 'bg-red-500/50'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step Card */}
        <div className="bg-slate-900/80 backdrop-blur-lg rounded-2xl border border-red-900/20 p-8">
          {/* Step Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
              <StepIcon className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-white">{step.title}</h2>
                {step.optional && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Optional</span>
                )}
              </div>
              <p className="text-slate-400">{step.subtitle}</p>
            </div>
          </div>

          <p className="text-slate-300 mb-6">{step.description}</p>

          {/* Instructions */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Setup Instructions:</h3>
            <ol className="space-y-2">
              {step.instructions.map((instruction, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                  <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 text-xs">
                    {i + 1}
                  </span>
                  {instruction}
                </li>
              ))}
            </ol>
            <a
              href={step.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 text-sm mt-4"
            >
              Open {step.title}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Input */}
          <div className="space-y-2 mb-8">
            <Label className="text-slate-300">API Key / Link</Label>
            <Input
              placeholder={step.placeholder}
              value={apiKeys[step.fieldName]}
              onChange={(e) => setApiKeys({...apiKeys, [step.fieldName]: e.target.value})}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-slate-400 hover:text-white"
              >
                Skip
              </Button>
            </div>
            <Button
              onClick={handleNext}
              disabled={saving}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600"
            >
              {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Skip All */}
        <div className="text-center mt-6">
          <button
            onClick={handleSkipAll}
            className="text-slate-500 hover:text-slate-400 text-sm"
          >
            Skip setup and configure later
          </button>
        </div>
      </div>
    </div>
  );
}
