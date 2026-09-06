import React from 'react';
import { User } from 'firebase/auth';
import { BookOpen, LogOut, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { logOut } from '../firebase';

interface NavbarProps {
  user: User;
  onNewEntry: () => void;
  onOpenSecurity: () => void;
  isSaving?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onNewEntry,
  onOpenSecurity,
  isSaving = false,
}) => {
  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-medium text-stone-900 tracking-tight">
              Reflection Journal
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Gemini 3.6 Flash
            </span>
          </div>
        </div>

        {/* Actions & User Profile */}
        <div className="flex items-center gap-3">
          {/* New Reflection Button */}
          <button
            id="nav-new-reflection-btn"
            onClick={onNewEntry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Reflection</span>
          </button>

          {/* Security Rules Inspector Button */}
          <button
            id="nav-security-btn"
            onClick={onOpenSecurity}
            title="View Security Model & Threat Isolation"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">Security Specs</span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-stone-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-semibold">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
            )}
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-medium text-stone-900 leading-tight">
                {user.displayName || 'Authenticated User'}
              </span>
              <span className="text-[11px] text-stone-500 leading-tight">
                {user.email}
              </span>
            </div>

            {/* Logout Button */}
            <button
              id="nav-logout-btn"
              onClick={() => logOut()}
              title="Sign Out"
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
