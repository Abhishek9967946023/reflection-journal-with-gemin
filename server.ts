import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Standard Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

// Lazy Google Gen AI Client Provider
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Resilient helper with fallback protocol
async function generateContentWithFallback(
  ai: GoogleGenAI,
  contents: any,
  systemInstruction?: string
): Promise<{ text: string; modelUsed: string }> {
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      console.log(`[Gemini API] Querying model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config: systemInstruction
          ? {
              systemInstruction,
              temperature: 0.7,
            }
          : {
              temperature: 0.7,
            },
      });

      const text = response.text || '';
      return { text, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || String(err);
      const status = err?.status || err?.statusCode || '';
      console.warn(`[Gemini Fallback] Model ${model} encountered issue (${status}): ${errorMsg}. Falling back...`);
      // Continue to next model in ladder
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || lastError}`);
}

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// 2. Reflection & Brainstorming Endpoint
app.post('/api/gemini/reflect', async (req, res) => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const mode = typeof body.mode === 'string' ? body.mode : 'reflect';
    const history = Array.isArray(body.history) ? body.history : [];

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    // Guard payload boundary limits
    if (prompt.length > 8000) {
      return res.status(400).json({ error: 'Prompt exceeds maximum character limit of 8000.' });
    }

    const ai = getAIClient();

    let systemInstruction = `You are a thoughtful, empathetic, and insightful journaling companion and reflection guide powered by Gemini.
Your purpose is to help the user process their thoughts, discover patterns, gain clarity, and brainstorm solutions.
Maintain a warm, grounded, and non-judgmental tone.
Use clean Markdown formatting with paragraphs, bullet points, or bold highlights when beneficial.`;

    if (mode === 'brainstorm') {
      systemInstruction += `\nFOCUS: Brainstorming creative angles, innovative possibilities, and constructive perspectives based on what the user shared.`;
    } else if (mode === 'summarize') {
      systemInstruction += `\nFOCUS: Summarizing the core themes, emotional currents, and key takeaways concisely.`;
    } else if (mode === 'action_plan') {
      systemInstruction += `\nFOCUS: Formulating actionable, gentle next steps and constructive habits the user can explore.`;
    } else {
      systemInstruction += `\nFOCUS: Thoughtful reflection, deep gentle inquiries, and emotional validation.`;
    }

    // Format conversation history for multi-turn context
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Add safe bounded history (up to last 10 turns)
    const recentHistory = history.slice(-10);
    for (const item of recentHistory) {
      if (item && typeof item.text === 'string' && (item.role === 'user' || item.role === 'model')) {
        contents.push({
          role: item.role,
          parts: [{ text: item.text.slice(0, 4000) }],
        });
      }
    }

    // Append current prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const { text, modelUsed } = await generateContentWithFallback(ai, contents, systemInstruction);

    return res.json({
      response: text,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error generating reflection:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate reflection response.',
    });
  }
});

// 3. Summarization & Tagging Endpoint
app.post('/api/gemini/summarize', async (req, res) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const turns = Array.isArray(body.turns) ? body.turns : [];

    if (!content && turns.length === 0) {
      return res.status(400).json({ error: 'Journal content or conversation turns are required for summary.' });
    }

    const ai = getAIClient();

    let compiledText = `Title: ${title || 'Untitled'}\n\nInitial Reflection:\n${content}\n\n`;
    if (turns.length > 0) {
      compiledText += `Conversation Dialogue:\n` + turns.map((t: any) => `${t.role === 'user' ? 'User' : 'Gemini'}: ${t.text}`).join('\n');
    }

    const systemInstruction = `You are an expert reflective analyst. Analyze this user's journal entry and dialogue.
Return a structured JSON with two fields:
1. "summary": A concise, poignant 2-3 sentence summary of the reflection's core insights and mindset.
2. "tags": An array of 3 to 5 lowercase keyword tags representing themes (e.g. ["gratitude", "career", "mindfulness", "decision-making"]).
Ensure valid JSON output only with no extra commentary.`;

    const { text, modelUsed } = await generateContentWithFallback(
      ai,
      [{ role: 'user', parts: [{ text: compiledText.slice(0, 8000) }] }],
      systemInstruction
    );

    let parsed = { summary: '', tags: [] as string[] };
    try {
      // Clean potential code fences
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        summary: text.slice(0, 300),
        tags: ['reflection', 'journal', 'insights'],
      };
    }

    return res.json({
      summary: parsed.summary || 'A thoughtful journal exploration.',
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['reflection'],
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate summary.',
    });
  }
});

// Setup Vite development middleware or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
