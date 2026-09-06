import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, sanitizeForFirestore, testConnection } from './firebase';
import { JournalEntry, OperationType } from './types';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { HistorySidebar } from './components/HistorySidebar';
import { JournalEditor } from './components/JournalEditor';
import { SecurityModal } from './components/SecurityModal';
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // 1. Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Validate Firestore Server Connection
  useEffect(() => {
    testConnection();
  }, []);

  // 3. Load User Entries with Realtime Sync
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setSelectedEntry(null);
      return;
    }

    setIsLoadingEntries(true);
    const entriesPath = `users/${user.uid}/entries`;

    try {
      const entriesRef = collection(db, 'users', user.uid, 'entries');
      const unsubscribe = onSnapshot(
        entriesRef,
        (snapshot) => {
          const items: JournalEntry[] = [];
          snapshot.forEach((docSnap) => {
            items.push(docSnap.data() as JournalEntry);
          });

          // Sort descending by updatedAt or createdAt
          items.sort((a, b) => {
            const timeA = new Date(a.updatedAt || a.createdAt).getTime();
            const timeB = new Date(b.updatedAt || b.createdAt).getTime();
            return timeB - timeA;
          });

          setEntries(items);
          setIsLoadingEntries(false);

          // If no entry is currently selected or current selection is refreshed, set active
          setSelectedEntry((prev) => {
            if (!prev) {
              return items.length > 0 ? items[0] : createNewEntryDraft(user.uid);
            }
            const matching = items.find((e) => e.id === prev.id);
            return matching || prev;
          });
        },
        (error) => {
          console.error('Firestore listener error:', error);
          setIsLoadingEntries(false);
          try {
            handleFirestoreError(error, OperationType.LIST, entriesPath);
          } catch (e) {
            // Logged to console
          }
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error establishing Firestore listener:', err);
      setIsLoadingEntries(false);
    }
  }, [user]);

  // Helper: Create a fresh entry draft
  const createNewEntryDraft = (userId: string): JournalEntry => {
    const now = new Date().toISOString();
    return {
      id: 'entry-' + Date.now(),
      userId,
      title: '',
      content: '',
      turns: [],
      summary: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
  };

  // Handler: Start New Entry
  const handleNewEntry = () => {
    if (!user) return;
    const newDraft = createNewEntryDraft(user.uid);
    setSelectedEntry(newDraft);
    setShowMobileSidebar(false);
  };

  // Handler: Save Entry to Firestore (Zero-Crash Payload Hygiene & Strict User Isolation)
  const handleSaveEntry = async (entryToSave: JournalEntry): Promise<boolean> => {
    if (!user) return false;
    setIsSaving(true);
    setSaveError(null);

    const targetPath = `users/${user.uid}/entries/${entryToSave.id}`;
    const interactionsPath = `users/${user.uid}/interactions/${entryToSave.id}`;

    try {
      // 1. Enforce strict ownership binding
      const payload: JournalEntry = {
        ...entryToSave,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      };

      // 2. Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
      const sanitizedPayload = sanitizeForFirestore(payload);

      // 3. Persist to primary entries subcollection
      await setDoc(doc(db, 'users', user.uid, 'entries', entryToSave.id), sanitizedPayload);

      // 4. Also mirror to interactions collection for interaction audit trail
      await setDoc(doc(db, 'users', user.uid, 'interactions', entryToSave.id), sanitizedPayload);

      setSelectedEntry(payload);
      return true;
    } catch (error: any) {
      console.error('Save failed:', error);
      const errMsg = error?.message || 'Error saving to Firestore.';
      setSaveError(errMsg);
      try {
        handleFirestoreError(error, OperationType.WRITE, targetPath);
      } catch (e) {
        // Logged via standard handleFirestoreError
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Delete Entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'entries', entryId));
      await deleteDoc(doc(db, 'users', user.uid, 'interactions', entryId));

      if (selectedEntry?.id === entryId) {
        const remaining = entries.filter((e) => e.id !== entryId);
        if (remaining.length > 0) {
          setSelectedEntry(remaining[0]);
        } else {
          setSelectedEntry(createNewEntryDraft(user.uid));
        }
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/entries/${entryId}`);
    }
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-500 font-sans tracking-wide">
            Initializing Secure Identity Session...
          </p>
        </div>
      </div>
    );
  }

  // Not Authenticated -> Show Landing Page
  if (!user) {
    return <LandingPage />;
  }

  // Authenticated Dashboard
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        user={user}
        onNewEntry={handleNewEntry}
        onOpenSecurity={() => setIsSecurityModalOpen(true)}
        isSaving={isSaving}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Mobile Sidebar Toggle Button */}
        <div className="md:hidden p-2 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-700 cursor-pointer"
          >
            {showMobileSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            <span>{showMobileSidebar ? 'Hide Past Reflections' : 'View Past Reflections'}</span>
          </button>
          <span className="text-xs text-stone-500 font-medium">
            {entries.length} reflections
          </span>
        </div>

        {/* Sidebar */}
        <div className={`${showMobileSidebar ? 'block' : 'hidden'} md:block`}>
          <HistorySidebar
            entries={entries}
            selectedEntryId={selectedEntry?.id || null}
            onSelectEntry={(entry) => {
              setSelectedEntry(entry);
              setShowMobileSidebar(false);
            }}
            onDeleteEntry={handleDeleteEntry}
            onNewEntry={handleNewEntry}
            isLoading={isLoadingEntries}
          />
        </div>

        {/* Editor Workspace */}
        {selectedEntry ? (
          <JournalEditor
            key={selectedEntry.id}
            entry={selectedEntry}
            onSave={handleSaveEntry}
            isSaving={isSaving}
            saveError={saveError}
            onClearSaveError={() => setSaveError(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-stone-400 text-xs">
            Select an entry or start a new reflection.
          </div>
        )}
      </div>

      {/* Security Architecture Modal */}
      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        currentUserId={user.uid}
      />
    </div>
  );
}
