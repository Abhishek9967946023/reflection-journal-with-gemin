import React, { useState } from 'react';
import { Sparkles, Shield, Lock, BookOpen, MessageSquareText, Compass, ArrowRight, CheckCircle2 } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

interface LandingPageProps {
  onSignedIn?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = () => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign in failed', err);
      setAuthError(err?.message || 'Authentication was cancelled or failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight text-stone-900">Reflection Journal</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">Gemini 3.6 Flash</span>
            </div>
          </div>

          <button
            id="login-header-btn"
            onClick={handleLogin}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-200/70 text-emerald-800 text-xs font-medium shadow-xs">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Strict User Data Isolation &bull; Firebase Google Sign-In</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-900 font-normal leading-[1.2]">
            A private sanctuary for your reflections, enriched by <span className="italic text-emerald-700 font-serif">conversational AI</span>.
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-stone-600 max-w-2xl mx-auto font-sans leading-relaxed">
            Record multi-turn journal entries, brainstorm constructive perspectives, and receive mindful summaries powered by Gemini 3.6 Flash. Every thought is securely isolated to your private account.
          </p>

          {/* Error Message */}
          {authError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm max-w-md mx-auto text-left">
              <p className="font-medium">Sign-in Notice:</p>
              <p className="text-xs mt-1 text-rose-600">{authError}</p>
            </div>
          )}

          {/* CTA Box */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="google-signin-hero-btn"
              onClick={handleLogin}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-base shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.7 0 3 .7 3.9 1.5l2.9-2.9C17 2 14.7 1 12 1 7.4 1 3.5 3.6 1.7 7.4l3.7 2.9C6.3 7.3 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.4 14.7c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.7 7.2C.6 9.4 0 11.9 0 14.5s.6 5.1 1.7 7.3l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.7-2.3-6.6-5.3L1.7 17C3.5 20.8 7.4 24 12 24z"
                />
              </svg>
              <span>{loading ? 'Opening Google Sign-In...' : 'Continue with Google'}</span>
              <ArrowRight className="w-4 h-4 text-stone-400" />
            </button>
          </div>

          <p className="text-xs text-stone-400 font-sans">
            Passwordless federated authentication. Your credentials are never handled or stored directly.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16 w-full">
          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-stone-900">Multi-Turn Reflections</h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Engage in an exploratory dialogue with Gemini. Discuss emotions, brainstorm solutions, and receive targeted inquiries that deepen self-awareness.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-stone-900">Smart Summaries & Themes</h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Auto-generate structured executive summaries and recurring topical tags with Gemini 3.6 Flash to identify trends in your personal journaling over time.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-stone-900">Zero-Trust Isolation</h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Your entries are strictly bound to your Firebase UID (<code className="text-xs bg-stone-100 px-1 py-0.5 rounded text-stone-800">request.auth.uid == userId</code>) in Cloud Firestore. No user can read or modify another's thoughts.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-white/50 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Deployed with Cloud Firestore, Firebase Auth, and Google Gemini API</span>
          </div>
          <div>
            <span>End-to-End User Isolation Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
