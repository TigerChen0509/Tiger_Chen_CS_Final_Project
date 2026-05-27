from flask import Blueprint, request, jsonify
import os
import re
import json
from openai import OpenAI

chat_bp = Blueprint('chat', __name__)

SYSTEM_PROMPT = """You are TaskBot, a friendly and helpful AI assistant inside TaskTock — a daily reminder and checklist app for students.

Your job:
- Help users manage their tasks via natural language
- Create tasks when the user asks (return structured JSON)
- Suggest priorities, what to focus on, and time management tips
- Be concise, warm, and encouraging

When the user wants to CREATE a task, respond with a JSON action block AND a friendly message. Use this exact format:

```action
{"action":"create_task","title":"...","due_date":"YYYY-MM-DDTHH:MM","notes":"","category":"General"}
```
Your friendly message here.

Rules for task creation:
- If no time is specified, default to 09:00
- If no date is specified, use today
- Categories: School, Work, Health, Personal, Shopping, General
- "tomorrow", "next friday", "today" should be resolved to actual dates
- Keep titles short and clear

When the user asks about their tasks, give a helpful summary or suggestion.
When the user just wants to chat, be friendly but gently steer toward productivity.

Always be brief — 1-3 sentences max for chat, plus the action block if creating a task."""

def build_user_message(user_msg, tasks):
    from datetime import date
    today = date.today().isoformat()
    if tasks:
        task_summary = '\n'.join(
            f'- "{t.get("title", "")}" ({t.get("status", "")}) due {t.get("due_date", "")} [{t.get("category", "")}]'
            for t in tasks
        )
    else:
        task_summary = 'No tasks yet.'

    return f"Today's date: {today}\n\nCurrent tasks:\n{task_summary}\n\nUser says: {user_msg}"

def extract_action(text):
    match = re.search(r'```action\n([\s\S]*?)\n```', text)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return None

def extract_reply(text):
    return re.sub(r'```action\n[\s\S]*?\n```', '', text).strip()

@chat_bp.route('/', methods=['POST'])
def chat():
    data = request.get_json()
    message = (data.get('message') or '').strip()
    tasks = data.get('tasks', [])

    if not message:
        return jsonify({'error': 'Message is required.'}), 400

    api_key = os.environ.get('DOUBAO_API_KEY')
    model = os.environ.get('DOUBAO_MODEL', 'doubao-seed-1-8-251228')
    if not api_key:
        return jsonify({'error': 'AI not configured. Set DOUBAO_API_KEY in backend .env file.'}), 500

    try:
        client = OpenAI(api_key=api_key, base_url='https://ark.cn-beijing.volces.com/api/v3')
        user_content = build_user_message(message, tasks)

        result = client.chat.completions.create(
            model=model,
            messages=[
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': user_content},
            ],
            temperature=0.7,
            max_tokens=500,
        )

        response = result.choices[0].message.content
        action = extract_action(response)
        reply = extract_reply(response) or response

        return jsonify({'reply': reply, 'action': action})
    except Exception as e:
        print(f'Doubao error: {e}')
        return jsonify({'error': 'AI request failed. Check your API key and endpoint in .env file.'}), 500
