import React from 'react';
import { X, ShieldCheck, Database, Key, CheckCircle, Server } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-stone-200 relative my-8">
        <button
          id="close-security-modal-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Security Architecture & User Isolation</h2>
            <p className="text-xs text-stone-500">Zero-Trust rules and isolated Firestore persistence</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-stone-600">
          {/* Isolation Rule */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center gap-2 text-stone-900 font-medium">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Hardened Firestore Security Rules (Active)</span>
            </div>
            <pre className="bg-stone-900 text-emerald-400 p-3 rounded-lg text-[11px] font-mono overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`}
            </pre>
            <p className="text-[11px] text-stone-500">
              Only authenticated requests matching your specific Firebase UID (<span className="font-mono text-stone-800 font-semibold">{currentUserId}</span>) can read or write these reflections.
            </p>
          </div>

          {/* Model Fallback Ladder & Secret Hygiene */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-stone-900">
                <Server className="w-4 h-4 text-sky-600" />
                <span>Gemini Fallback Ladder</span>
              </div>
              <ul className="text-[11px] space-y-1 text-stone-500 list-disc list-inside">
                <li>Primary: <code className="text-stone-800">gemini-3.6-flash</code></li>
                <li>HA Fallback: <code className="text-stone-800">gemini-3.1-flash-lite</code></li>
                <li>Dynamic Alias: <code className="text-stone-800">gemini-flash-latest</code></li>
                <li>Deep Reasoning: <code className="text-stone-800">gemini-3.7-flash</code></li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-stone-900">
                <Key className="w-4 h-4 text-amber-600" />
                <span>Zero-Hardcoding Standards</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                All Gemini API keys are retrieved server-side via environment variables / Secret Manager (<code className="text-stone-800">process.env.GEMINI_API_KEY</code>). No secret is exposed to the client.
              </p>
            </div>
          </div>

          {/* Project Details */}
          <div className="pt-2 border-t border-stone-200 flex flex-wrap gap-y-1 justify-between text-[11px] text-stone-400">
            <span>Project ID: <strong className="text-stone-700">{firebaseConfig.projectId}</strong></span>
            <span>Database: <strong className="text-stone-700">{firebaseConfig.firestoreDatabaseId}</strong></span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            id="dismiss-security-modal-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium cursor-pointer transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
