import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SetupGuide from '@/components/SetupGuide';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      toast.success('Payment successful! Let\'s set up your account.');
    }
  }, [searchParams]);

  const handleCompleteOnboarding = async () => {
    setCompleting(true);
    try {
      await api.post('/user/complete-onboarding');
      toast.success('Setup complete! Welcome to AutoBookd.');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to complete setup');
    } finally {
      setCompleting(false);
    }
  };

  const handleSkipSetup = async () => {
    setCompleting(true);
    try {
      await api.post('/user/complete-onboarding');
      toast.info('You can set up API keys later in Settings.');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to complete setup');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 py-12 px-4" data-testid="onboarding-page">
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

        {/* Setup Guide Component (non-modal mode) */}
        <div className="bg-slate-900/80 backdrop-blur-lg rounded-2xl border border-red-900/20 p-6">
          <SetupGuide isModal={false} />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Button
            onClick={handleCompleteOnboarding}
            disabled={completing}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 w-full sm:w-auto"
            data-testid="complete-setup-btn"
          >
            I'm Done, Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <button
            onClick={handleSkipSetup}
            disabled={completing}
            className="text-slate-500 hover:text-slate-400 text-sm"
            data-testid="skip-setup-btn"
          >
            Skip setup and configure later
          </button>
        </div>
      </div>
    </div>
  );
}
