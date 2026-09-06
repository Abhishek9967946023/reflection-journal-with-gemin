import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Save,
  Check,
  AlertCircle,
  Brain,
  ListTodo,
  FileText,
  Compass,
  Tag,
  Copy,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { JournalEntry, ConversationTurn, ReflectionMode } from '../types';

interface JournalEditorProps {
  entry: JournalEntry;
  onSave: (updatedEntry: JournalEntry) => Promise<boolean>;
  isSaving: boolean;
  saveError: string | null;
  onClearSaveError: () => void;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  entry,
  onSave,
  isSaving,
  saveError,
  onClearSaveError,
}) => {
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [turns, setTurns] = useState<ConversationTurn[]>(entry.turns || []);
  const [summary, setSummary] = useState(entry.summary || '');
  const [tags, setTags] = useState<string[]>(entry.tags || []);
  const [mode, setMode] = useState<ReflectionMode>('reflect');
  const [newTagInput, setNewTagInput] = useState('');

  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [copied, setCopied] = useState(false);

  const conversationBottomRef = useRef<HTMLDivElement>(null);

  // Sync state when selected entry changes
  useEffect(() => {
    setTitle(entry.title);
    setContent(entry.content);
    setTurns(entry.turns || []);
    setSummary(entry.summary || '');
    setTags(entry.tags || []);
    setHasUnsavedChanges(false);
    setGenError(null);
  }, [entry.id]);

  // Scroll to bottom of conversation turns when updated
  useEffect(() => {
    conversationBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isGenerating]);

  // Track unsaved state
  const markDirty = () => setHasUnsavedChanges(true);

  // Suggested Prompts based on Mode
  const getSuggestions = () => {
    switch (mode) {
      case 'brainstorm':
        return [
          'What are 3 alternative perspectives on this situation?',
          'What unexpected opportunities could emerge from this challenge?',
          'Brainstorm creative solutions without judging feasibility.',
        ];
      case 'action_plan':
        return [
          'What is one tiny, low-friction action I can take today?',
          'How can I structure a 3-step experiment to test this?',
          'What boundaries should I set to protect my energy?',
        ];
      case 'summarize':
        return [
          'What is the central theme of my feelings right now?',
          'Summarize this into a single grounding mantra.',
          'Extract the key lesson I should remember tomorrow.',
        ];
      default:
        return [
          'What underlying emotions or fears might be fueling this?',
          'How can I speak to myself with more compassion here?',
          'If a close friend shared this with me, what would I tell them?',
        ];
    }
  };

  // Trigger Gemini Reflection
  const handleSendPrompt = async (customPrompt?: string) => {
    const textToSend = customPrompt || promptInput.trim();
    if (!textToSend && !content.trim()) return;

    const actualPrompt = textToSend || content.trim();
    setGenError(null);
    setIsGenerating(true);

    // Create user turn
    const userTurn: ConversationTurn = {
      id: 'turn-' + Date.now(),
      role: 'user',
      text: actualPrompt,
      timestamp: new Date().toISOString(),
      mode,
    };

    const updatedTurns = [...turns, userTurn];
    setTurns(updatedTurns);
    if (!customPrompt) setPromptInput('');
    markDirty();

    try {
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: actualPrompt,
          mode,
          history: turns.map((t) => ({ role: t.role, text: t.text })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to receive reflection from Gemini.');
      }

      const modelTurn: ConversationTurn = {
        id: 'turn-' + (Date.now() + 1),
        role: 'model',
        text: data.response,
        timestamp: new Date().toISOString(),
        mode,
        modelUsed: data.modelUsed,
      };

      const finalTurns = [...updatedTurns, modelTurn];
      setTurns(finalTurns);
      markDirty();

      // Automatically trigger save after response for reliability
      await onSave({
        ...entry,
        title: title.trim() || 'Reflection of ' + new Date().toLocaleDateString(),
        content,
        turns: finalTurns,
        summary,
        tags,
        updatedAt: new Date().toISOString(),
      });
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('Gemini error:', err);
      setGenError(err?.message || 'Error communicating with Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger Auto-Summarize & Tagging
  const handleAutoSummarize = async () => {
    if (!content.trim() && turns.length === 0) {
      setGenError('Please enter some reflection text or have a conversation first.');
      return;
    }

    setIsSummarizing(true);
    setGenError(null);

    try {
      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Untitled',
          content,
          turns: turns.map((t) => ({ role: t.role, text: t.text })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to summarize.');
      }

      setSummary(data.summary || '');
      if (data.tags && Array.isArray(data.tags)) {
        const mergedTags = Array.from(new Set([...tags, ...data.tags]));
        setTags(mergedTags);
      }
      markDirty();

      // Save updated summary
      await onSave({
        ...entry,
        title: title || 'Reflection',
        content,
        turns,
        summary: data.summary,
        tags: data.tags || tags,
        updatedAt: new Date().toISOString(),
      });
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('Summarize error:', err);
      setGenError(err?.message || 'Failed to generate summary.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Explicit Save Handler
  const handleSaveClick = async () => {
    onClearSaveError();
    const updated: JournalEntry = {
      ...entry,
      title: title.trim() || 'Reflection ' + new Date().toLocaleDateString(),
      content: content.trim(),
      turns,
      summary,
      tags,
      updatedAt: new Date().toISOString(),
    };
    const success = await onSave(updated);
    if (success) {
      setHasUnsavedChanges(false);
    }
  };

  // Add Tag
  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    const clean = newTagInput.trim().toLowerCase().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setNewTagInput('');
      markDirty();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    markDirty();
  };

  const handleCopyAll = () => {
    let fullText = `# ${title || 'Reflection'}\n\n`;
    if (content) fullText += `## Initial Thoughts:\n${content}\n\n`;
    if (summary) fullText += `## Key Summary:\n${summary}\n\n`;
    if (turns.length > 0) {
      fullText += `## Dialogue with Gemini:\n`;
      turns.forEach((t) => {
        fullText += `\n**${t.role === 'user' ? 'You' : 'Gemini'}**:\n${t.text}\n`;
      });
    }
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-white overflow-hidden">
      {/* Top Action & Status Bar */}
      <div className="border-b border-stone-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 bg-white/90 sticky top-0 z-10">
        {/* Title Input */}
        <div className="flex-1 min-w-[240px]">
          <input
            id="reflection-title-input"
            type="text"
            placeholder="Reflection Title (e.g., Finding clarity after a long week...)"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            className="w-full text-lg font-serif font-medium text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-0 border-none bg-transparent"
          />
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            id="copy-reflection-btn"
            onClick={handleCopyAll}
            title="Copy reflection markdown to clipboard"
            className="p-2 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer text-xs flex items-center gap-1"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Export'}</span>
          </button>

          {/* Auto-Summarize Button */}
          <button
            id="auto-summarize-btn"
            onClick={handleAutoSummarize}
            disabled={isSummarizing || isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSummarizing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>{isSummarizing ? 'Summarizing...' : 'Summarize & Tag'}</span>
          </button>

          {/* Save Button */}
          <button
            id="save-reflection-btn"
            onClick={handleSaveClick}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-2xs ${
              hasUnsavedChanges
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : hasUnsavedChanges ? (
              <Save className="w-3.5 h-3.5" />
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>{isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved to Cloud'}</span>
          </button>
        </div>
      </div>

      {/* Save Error Alert Banner */}
      {saveError && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2 flex items-center justify-between text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Failed to persist entry to Firestore: {saveError}</span>
          </div>
          <button
            id="retry-save-btn"
            onClick={handleSaveClick}
            className="px-2.5 py-1 rounded bg-rose-700 text-white font-medium hover:bg-rose-800 transition-colors cursor-pointer"
          >
            Retry Save
          </button>
        </div>
      )}

      {/* Generation Error Alert */}
      {genError && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{genError}</span>
          </div>
          <button
            onClick={() => setGenError(null)}
            className="text-amber-700 hover:text-amber-900 underline font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Area (Split Scrollable) */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Initial Journal Entry Box */}
        <div className="p-4 rounded-xl border border-stone-200/90 bg-stone-50/40 focus-within:bg-white focus-within:border-emerald-600 transition-colors space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Journal Entry & Reflections
            </span>
            <span className="text-[11px] text-stone-400">
              {content.length} characters
            </span>
          </div>
          <textarea
            id="journal-content-textarea"
            rows={4}
            placeholder="Write freely about what happened today, what thoughts are on your mind, or what questions you are grappling with..."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              markDirty();
            }}
            className="w-full text-sm text-stone-800 placeholder:text-stone-400 bg-transparent border-none focus:outline-none focus:ring-0 resize-y leading-relaxed font-sans"
          />
        </div>

        {/* AI Summary & Tags Panel (if available) */}
        {(summary || tags.length > 0) && (
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Gemini Insights & Themes</span>
            </div>

            {summary && (
              <p className="text-xs text-amber-900/90 font-serif leading-relaxed italic">
                "{summary}"
              </p>
            )}

            {/* Tag Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Tag className="w-3 h-3 text-amber-700" />
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-900 font-medium"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-amber-700 text-amber-500 cursor-pointer ml-0.5"
                  >
                    &times;
                  </button>
                </span>
              ))}

              {/* Add Tag Input */}
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ tag"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="w-16 px-1.5 py-0.5 text-[11px] border border-amber-300/80 rounded bg-white text-amber-900 focus:outline-none focus:w-24 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Dialogue & Exploration Mode
            </span>
            <span className="text-[11px] text-stone-400">
              Select how Gemini should engage with your thoughts
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              id="mode-reflect-btn"
              onClick={() => setMode('reflect')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                mode === 'reflect'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-2xs'
                  : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              <Compass className={`w-4 h-4 ${mode === 'reflect' ? 'text-emerald-700' : 'text-stone-400'}`} />
              <div>
                <div className="text-xs font-medium leading-tight">Reflect & Inquire</div>
                <div className="text-[10px] text-stone-500">Gentle depth</div>
              </div>
            </button>

            <button
              id="mode-brainstorm-btn"
              onClick={() => setMode('brainstorm')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                mode === 'brainstorm'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-2xs'
                  : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              <Brain className={`w-4 h-4 ${mode === 'brainstorm' ? 'text-emerald-700' : 'text-stone-400'}`} />
              <div>
                <div className="text-xs font-medium leading-tight">Brainstorm Ideas</div>
                <div className="text-[10px] text-stone-500">Fresh angles</div>
              </div>
            </button>

            <button
              id="mode-summary-btn"
              onClick={() => setMode('summarize')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                mode === 'summarize'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-2xs'
                  : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              <FileText className={`w-4 h-4 ${mode === 'summarize' ? 'text-emerald-700' : 'text-stone-400'}`} />
              <div>
                <div className="text-xs font-medium leading-tight">Core Summary</div>
                <div className="text-[10px] text-stone-500">Key takeaways</div>
              </div>
            </button>

            <button
              id="mode-action-btn"
              onClick={() => setMode('action_plan')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                mode === 'action_plan'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-2xs'
                  : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              <ListTodo className={`w-4 h-4 ${mode === 'action_plan' ? 'text-emerald-700' : 'text-stone-400'}`} />
              <div>
                <div className="text-xs font-medium leading-tight">Action Steps</div>
                <div className="text-[10px] text-stone-500">Constructive paths</div>
              </div>
            </button>
          </div>
        </div>

        {/* Suggested Prompt Chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-stone-400 font-medium">Quick Prompts:</span>
          {getSuggestions().map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSendPrompt(suggestion)}
              disabled={isGenerating}
              className="text-[11px] px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-normal transition-colors cursor-pointer border border-stone-200/80 disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Multi-Turn Conversation Stream */}
        <div className="space-y-4 pt-2">
          {turns.length === 0 && !isGenerating && (
            <div className="py-8 px-4 text-center rounded-xl border border-dashed border-stone-200 text-stone-400 text-xs space-y-2">
              <Compass className="w-6 h-6 text-stone-300 mx-auto" />
              <p className="font-medium text-stone-600">No AI conversation turns yet.</p>
              <p className="text-[11px] max-w-sm mx-auto">
                Write your journal entry above, click one of the suggested prompts, or type a reflection inquiry below to converse with Gemini.
              </p>
            </div>
          )}

          {turns.map((turn) => {
            const isUser = turn.role === 'user';
            return (
              <div
                key={turn.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 px-1">
                  <span className="font-medium text-stone-600">
                    {isUser ? 'You' : 'Gemini'}
                  </span>
                  <span>&bull;</span>
                  <span>{new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {turn.modelUsed && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                      {turn.modelUsed}
                    </span>
                  )}
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-stone-900 text-stone-50 rounded-tr-xs'
                      : 'bg-stone-50 border border-stone-200 text-stone-800 rounded-tl-xs shadow-2xs'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{turn.text}</p>
                  ) : (
                    <div className="markdown-body prose prose-stone prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-serif">
                      <Markdown>{turn.text}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* In-Flight Generation Indicator */}
          {isGenerating && (
            <div className="flex flex-col items-start space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] text-stone-400 px-1">
                <span className="font-medium text-stone-600">Gemini</span>
                <span>&bull;</span>
                <span className="text-emerald-600 font-medium">Reflecting...</span>
              </div>
              <div className="rounded-2xl rounded-tl-xs p-4 bg-stone-50 border border-stone-200 text-stone-700 text-xs flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Formulating reflections with Gemini 3.6 Flash fallback ladder...</span>
              </div>
            </div>
          )}

          <div ref={conversationBottomRef} />
        </div>
      </div>

      {/* Bottom Sticky Conversation Input Bar */}
      <div className="border-t border-stone-200 p-4 bg-white/95 backdrop-blur-xs">
        <div className="flex items-center gap-2 max-w-5xl mx-auto">
          <input
            id="reflection-prompt-input"
            type="text"
            placeholder={
              content.trim()
                ? 'Ask Gemini to reflect on your entry, brainstorm ideas, or ask a question...'
                : 'Write a reflection question or prompt for Gemini...'
            }
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendPrompt();
              }
            }}
            disabled={isGenerating}
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
          />

          <button
            id="send-prompt-btn"
            onClick={() => handleSendPrompt()}
            disabled={isGenerating || (!promptInput.trim() && !content.trim())}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
