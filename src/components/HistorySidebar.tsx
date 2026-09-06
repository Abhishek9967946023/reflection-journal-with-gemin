import React, { useState, useMemo } from 'react';
import { Search, Calendar, MessageSquare, Trash2, Clock, ChevronRight, Tag, BookMarked } from 'lucide-react';
import { JournalEntry } from '../types';

interface HistorySidebarProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onNewEntry: () => void;
  isLoading: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onDeleteEntry,
  onNewEntry,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return entries;
    const term = searchTerm.toLowerCase();
    return entries.filter((e) => {
      const matchTitle = e.title.toLowerCase().includes(term);
      const matchContent = e.content.toLowerCase().includes(term);
      const matchTags = e.tags?.some((t) => t.toLowerCase().includes(term));
      return matchTitle || matchContent || matchTags;
    });
  }, [entries, searchTerm]);

  const handleDelete = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this reflection? This cannot be undone.')) {
      setDeletingId(entryId);
      try {
        await onDeleteEntry(entryId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <aside className="w-full md:w-80 border-r border-stone-200 bg-stone-50/50 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header & Search */}
      <div className="p-4 border-b border-stone-200 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-semibold text-stone-900">Your History</h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            id="history-search-input"
            type="text"
            placeholder="Search reflections, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
          />
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <div className="p-8 text-center text-xs text-stone-400">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading your reflections from Firestore...
          </div>
        )}

        {!isLoading && filteredEntries.length === 0 && (
          <div className="p-8 text-center text-xs text-stone-500 space-y-3">
            <Calendar className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="font-medium text-stone-700">
              {searchTerm ? 'No matching reflections found.' : 'No reflections logged yet.'}
            </p>
            <p className="text-stone-400 text-[11px] leading-relaxed">
              {searchTerm
                ? 'Try adjusting your search criteria.'
                : 'Start your journey by writing your first reflection with Gemini.'}
            </p>
            {!searchTerm && (
              <button
                id="sidebar-empty-new-entry-btn"
                onClick={onNewEntry}
                className="mt-2 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium cursor-pointer transition-colors"
              >
                Write First Reflection
              </button>
            )}
          </div>
        )}

        {!isLoading &&
          filteredEntries.map((entry) => {
            const isSelected = entry.id === selectedEntryId;
            const turnCount = entry.turns?.length || 0;

            return (
              <div
                key={entry.id}
                id={`history-entry-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-emerald-600 shadow-xs ring-1 ring-emerald-600'
                    : 'bg-white/80 hover:bg-white border-stone-200/80 hover:border-stone-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-medium text-stone-900 line-clamp-1 group-hover:text-emerald-800 transition-colors">
                    {entry.title || 'Untitled Reflection'}
                  </h3>

                  <button
                    id={`delete-entry-${entry.id}-btn`}
                    onClick={(e) => handleDelete(e, entry.id)}
                    disabled={deletingId === entry.id}
                    title="Delete reflection"
                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-rose-600 rounded transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 font-sans">
                  {entry.content || (entry.turns[0]?.text ?? 'No reflection text')}
                </p>

                {/* Metadata tags */}
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-stone-400 pt-1.5 border-t border-stone-100">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-stone-300" />
                    <span>{formatDate(entry.updatedAt || entry.createdAt)}</span>
                  </div>

                  {turnCount > 0 && (
                    <div className="flex items-center gap-1 text-emerald-700 font-medium">
                      <MessageSquare className="w-3 h-3" />
                      <span>{turnCount} {turnCount === 1 ? 'turn' : 'turns'}</span>
                    </div>
                  )}
                </div>

                {entry.tags && entry.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {entry.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </aside>
  );
};
