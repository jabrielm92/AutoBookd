import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
          <p className="text-slate-400 mt-2">Last updated: January 2025</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-lg rounded-2xl border border-red-900/20 p-8 prose prose-invert prose-slate max-w-none">
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly:</p>
          <ul>
            <li>Account information (name, email, password)</li>
            <li>Payment information (processed securely by Stripe)</li>
            <li>API keys for integrated services</li>
            <li>Lead data you import or generate</li>
            <li>Email content and communication logs</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use collected information to:</p>
          <ul>
            <li>Provide and maintain the AutoBookd service</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send transactional emails (verification, receipts)</li>
            <li>Improve our service and develop new features</li>
            <li>Provide customer support</li>
          </ul>

          <h2>3. Data Storage and Security</h2>
          <p>
            Your data is stored securely on MongoDB Atlas with encryption at rest and in transit. 
            We implement industry-standard security measures including encrypted connections (HTTPS), 
            secure password hashing, and access controls.
          </p>

          <h2>4. Third-Party Services</h2>
          <p>We integrate with third-party services that have their own privacy policies:</p>
          <ul>
            <li>Stripe - Payment processing</li>
            <li>SerpAPI - Lead discovery</li>
            <li>Hunter.io - Email finding</li>
            <li>Apollo.io - Lead enrichment</li>
            <li>OpenAI - AI processing</li>
            <li>Resend - Email delivery</li>
          </ul>

          <h2>5. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. Upon account deletion, 
            we will delete your personal data within 30 days, except where retention is required 
            by law or for legitimate business purposes.
          </p>

          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your data</li>
            <li>Export your data</li>
            <li>Opt out of marketing communications</li>
          </ul>

          <h2>7. Cookies</h2>
          <p>
            We use essential cookies for authentication and service functionality. 
            We do not use tracking cookies for advertising purposes.
          </p>

          <h2>8. Children's Privacy</h2>
          <p>
            AutoBookd is not intended for use by individuals under 18 years of age. 
            We do not knowingly collect information from children.
          </p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of 
            significant changes via email or through the service.
          </p>

          <h2>10. Contact Us</h2>
          <p>
            For privacy-related questions or to exercise your rights, contact us at:{' '}
            <a href="mailto:autobookd@arisolutionsinc.com" className="text-red-400">
              autobookd@arisolutionsinc.com
            </a>
          </p>
          <p>
            ARI Solutions Inc.<br />
            <a href="https://arisolutionsinc.com" target="_blank" rel="noopener noreferrer" className="text-red-400">
              arisolutionsinc.com
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
