const express = require('express');
const OpenAI = require('openai');

const router = express.Router();

const SYSTEM_PROMPT = `You are TaskBot, a friendly and helpful AI assistant inside TaskTock — a daily reminder and checklist app for students.

Your job:
- Help users manage their tasks via natural language
- Create tasks when the user asks (return structured JSON)
- Suggest priorities, what to focus on, and time management tips
- Be concise, warm, and encouraging

When the user wants to CREATE a task, respond with a JSON action block AND a friendly message. Use this exact format:

\`\`\`action
{"action":"create_task","title":"...","due_date":"YYYY-MM-DDTHH:MM","notes":"","category":"General"}
\`\`\`
Your friendly message here.

Rules for task creation:
- If no time is specified, default to 09:00
- If no date is specified, use today
- Categories: School, Work, Health, Personal, Shopping, General
- "tomorrow", "next friday", "today" should be resolved to actual dates
- Keep titles short and clear

When the user asks about their tasks, give a helpful summary or suggestion.
When the user just wants to chat, be friendly but gently steer toward productivity.

Always be brief — 1-3 sentences max for chat, plus the action block if creating a task.`;

function buildUserMessage(userMsg, tasks) {
  const today = new Date().toISOString().slice(0, 10);
  const taskSummary = tasks.length > 0
    ? tasks.map((t) => `- "${t.title}" (${t.status}) due ${t.due_date} [${t.category}]`).join('\n')
    : 'No tasks yet.';

  return `Today's date: ${today}

Current tasks:
${taskSummary}

User says: ${userMsg}`;
}

function extractAction(text) {
  const match = text.match(/```action\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractReply(text) {
  return text.replace(/```action\n[\s\S]*?\n```/g, '').trim();
}

// POST /chat
router.post('/', async (req, res) => {
  const { message, tasks } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const apiKey = process.env.DOUBAO_API_KEY;
  const model = process.env.DOUBAO_MODEL || 'doubao-seed-1-8-251228';
  if (!apiKey) {
    return res.status(500).json({ error: 'AI not configured. Set DOUBAO_API_KEY in backend .env file.' });
  }

  try {
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    });

    const userContent = buildUserMessage(message.trim(), tasks || []);

    const result = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = result.choices[0].message.content;
    const action = extractAction(response);
    const reply = extractReply(response) || response;

    res.json({ reply, action });
  } catch (err) {
    console.error('Doubao error:', err.message);
    res.status(500).json({ error: 'AI request failed. Check your API key and endpoint in .env file.' });
  }
});

module.exports = router;
