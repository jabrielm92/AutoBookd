import { useNavigate } from 'react-router-dom';
import { Zap, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';

const features = [
  "Automated lead discovery",
  "AI-powered website research",
  "Hyper-personalized email sequences",
  "Auto reply classification",
  "Calendar booking integration",
  "Full analytics dashboard",
  "Priority support"
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/signup');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/stripe/create-checkout');
      window.location.href = data.checkout_url;
    } catch (error) {
      toast.error('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AutoBookd</span>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-slate-900/80 backdrop-blur-lg rounded-2xl border border-red-900/30 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-center">
            <h2 className="text-white font-semibold text-lg mb-1">AutoBookd Pro</h2>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-white">$29.99</span>
              <span className="text-red-200">/month</span>
            </div>
            <p className="text-red-200 text-sm mt-2">3-day free trial included</p>
          </div>

          {/* Features */}
          <div className="p-6">
            <p className="text-slate-300 text-sm mb-4 text-center">Everything you need to automate your outreach</p>
            <div className="space-y-3 mb-6">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span className="text-slate-300">{feature}</span>
                </div>
              ))}
            </div>

            <Button 
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 py-6 text-lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <p className="text-slate-500 text-xs text-center mt-4">
              Cancel anytime. No questions asked.
            </p>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Secure payment powered by Stripe
        </p>
      </div>
    </div>
  );
}
