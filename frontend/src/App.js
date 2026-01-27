import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Pipeline from "@/pages/Pipeline";
import Conversations from "@/pages/Conversations";
import Discovery from "@/pages/Discovery";
import Bookings from "@/pages/Bookings";
import Settings from "@/pages/Settings";
import Analytics from "@/pages/Analytics";
import LandingPage from "@/pages/LandingPage";
import SignupPage from "@/pages/SignupPage";
import LoginPage from "@/pages/LoginPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import PricingPage from "@/pages/PricingPage";
import OnboardingPage from "@/pages/OnboardingPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import AdminPage from "@/pages/AdminPage";

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          
          {/* Protected app routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="discovery" element={<Discovery />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Alternate paths for nested routes */}
          <Route path="/leads" element={<Navigate to="/dashboard/leads" replace />} />
          <Route path="/pipeline" element={<Navigate to="/dashboard/pipeline" replace />} />
          <Route path="/conversations" element={<Navigate to="/dashboard/conversations" replace />} />
          <Route path="/discovery" element={<Navigate to="/dashboard/discovery" replace />} />
          <Route path="/bookings" element={<Navigate to="/dashboard/bookings" replace />} />
          <Route path="/analytics" element={<Navigate to="/dashboard/analytics" replace />} />
          <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
          
          {/* Admin route */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
