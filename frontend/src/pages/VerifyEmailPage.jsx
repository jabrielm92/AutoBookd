import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      await api.get(`/auth/verify-email?token=${token}`);
      setStatus('success');
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">AutoBookd</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-lg rounded-2xl border border-red-900/20 p-8">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-16 h-16 text-red-400 mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold text-white mb-2">Verifying Email...</h1>
              <p className="text-slate-400">Please wait while we verify your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
              <p className="text-slate-400 mb-6">Your email has been verified successfully. You can now log in.</p>
              <Button 
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600"
              >
                Continue to Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
              <p className="text-slate-400 mb-6">This link is invalid or has expired. Please request a new verification email.</p>
              <Button 
                onClick={() => navigate('/login')}
                variant="outline"
                className="border-slate-700 text-slate-300"
              >
                Back to Login
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
