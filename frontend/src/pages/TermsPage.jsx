import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AutoBookd</span>
          </Link>
          <h1 className="text-4xl font-bold text-white">Terms of Service</h1>
          <p className="text-slate-400 mt-2">Last updated: January 2025</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-lg rounded-2xl border border-red-900/20 p-8 prose prose-invert prose-slate max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using AutoBookd ("Service"), you accept and agree to be bound by the terms and provision of this agreement. 
            If you do not agree to abide by these terms, please do not use this service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            AutoBookd is an AI-powered lead generation and outreach automation platform provided by ARI Solutions Inc. 
            The service includes lead discovery, email enrichment, AI research, automated email sequences, and analytics.
          </p>

          <h2>3. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul>
            <li>Provide accurate information when creating an account</li>
            <li>Maintain the security of your account credentials</li>
            <li>Use the service in compliance with all applicable laws, including anti-spam regulations (CAN-SPAM, GDPR)</li>
            <li>Not use the service for any unlawful or prohibited activities</li>
            <li>Ensure your outreach complies with email marketing best practices</li>
          </ul>

          <h2>4. Subscription and Payment</h2>
          <p>
            AutoBookd offers a subscription-based service at $29.99/month with a 24-hour free trial. 
            By subscribing, you authorize us to charge your payment method on a recurring monthly basis. 
            You may cancel at any time, and your access will continue until the end of your billing period.
          </p>

          <h2>5. Third-Party Services</h2>
          <p>
            AutoBookd integrates with third-party services (SerpAPI, Hunter.io, Apollo, OpenAI, etc.). 
            Your use of these services is subject to their respective terms. We are not responsible for 
            the availability or accuracy of third-party services.
          </p>

          <h2>6. Data and Privacy</h2>
          <p>
            Your use of the service is also governed by our Privacy Policy. We collect and process 
            data necessary to provide the service. You retain ownership of your data and may export 
            or delete it at any time.
          </p>

          <h2>7. Limitation of Liability</h2>
          <p>
            ARI Solutions Inc. shall not be liable for any indirect, incidental, special, consequential, 
            or punitive damages resulting from your use of the service. Our total liability shall not 
            exceed the amount paid by you in the preceding 12 months.
          </p>

          <h2>8. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify users of significant 
            changes via email or through the service. Continued use after changes constitutes acceptance.
          </p>

          <h2>9. Contact</h2>
          <p>
            For questions about these terms, contact us at:{' '}
            <a href="mailto:autobookd@arisolutionsinc.com" className="text-red-400">
              autobookd@arisolutionsinc.com
            </a>
          </p>
        </div>

        <div className="text-center mt-8">
          <Link to="/" className="text-slate-400 hover:text-white">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
