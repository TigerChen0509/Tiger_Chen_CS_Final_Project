from flask import Blueprint, request, jsonify, g
import uuid
from datetime import datetime
from db import get_db
from auth import auth_required

tasks_bp = Blueprint('tasks', __name__)
tasks_bp.before_request(auth_required)

def gen_id():
    d = datetime.now()
    return f"t_{d.strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}"

def row_to_task(row):
    return {
        'task_id': row['task_id'],
        'title': row['title'],
        'notes': row['notes'] or '',
        'due_date': row['due_date'],
        'created_at': row['created_at'],
        'repeat': row['repeat_type'],
        'repeat_end': row['repeat_end'],
        'status': row['status'],
        'snooze_count': row['snooze_count'],
        'alarm_enabled': bool(row['alarm_enabled']),
        'completed_at': row['completed_at'],
        'instance_completions': __import__('json').loads(row['instance_completions'] or '{}'),
        'category': row['category'],
    }

@tasks_bp.route('/', methods=['GET'])
def get_tasks():
    db = get_db()
    rows = db.execute('SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC', (g.user_id,)).fetchall()
    db.close()
    return jsonify({'tasks': [row_to_task(r) for r in rows]})

@tasks_bp.route('/', methods=['POST'])
def create_task():
    data = request.get_json()
    title = (data.get('title') or '').strip()
    due_date = data.get('due_date')

    if not title:
        return jsonify({'error': 'Task title is required.'}), 400
    if not due_date:
        return jsonify({'error': 'Due date is required.'}), 400

    task_id = gen_id()
    now = datetime.utcnow().isoformat()
    db = get_db()
    db.execute(
        'INSERT INTO tasks (user_id, task_id, title, notes, due_date, created_at, repeat_type, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (g.user_id, task_id, title, data.get('notes', ''), due_date, now, data.get('repeat', 'none'), data.get('category', 'General'))
    )
    db.commit()
    row = db.execute('SELECT * FROM tasks WHERE task_id = ?', (task_id,)).fetchone()
    db.close()
    return jsonify({'task': row_to_task(row)}), 201

@tasks_bp.route('/<task_id>', methods=['PUT'])
def update_task(task_id):
    db = get_db()
    row = db.execute('SELECT * FROM tasks WHERE task_id = ? AND user_id = ?', (task_id, g.user_id)).fetchone()
    if not row:
        db.close()
        return jsonify({'error': 'Task not found.'}), 404

    data = request.get_json()
    fields = []
    values = []

    if 'title' in data and data['title'] is not None:
        fields.append('title = ?')
        values.append(data['title'].strip())
    if 'notes' in data and data['notes'] is not None:
        fields.append('notes = ?')
        values.append(data['notes'])
    if 'due_date' in data and data['due_date'] is not None:
        fields.append('due_date = ?')
        values.append(data['due_date'])
    if 'repeat' in data and data['repeat'] is not None:
        fields.append('repeat_type = ?')
        values.append(data['repeat'])
    if 'category' in data and data['category'] is not None:
        fields.append('category = ?')
        values.append(data['category'])
    if 'status' in data and data['status'] is not None:
        fields.append('status = ?')
        values.append(data['status'])
        if data['status'] == 'completed':
            fields.append('completed_at = ?')
            values.append(datetime.utcnow().isoformat())
        if data['status'] == 'pending':
            fields.append('completed_at = ?')
            values.append(None)
    if 'alarm_enabled' in data and data['alarm_enabled'] is not None:
        fields.append('alarm_enabled = ?')
        values.append(1 if data['alarm_enabled'] else 0)

    if not fields:
        db.close()
        return jsonify({'error': 'No fields to update.'}), 400

    values.extend([task_id, g.user_id])
    db.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE task_id = ? AND user_id = ?", values)
    db.commit()
    updated = db.execute('SELECT * FROM tasks WHERE task_id = ?', (task_id,)).fetchone()
    db.close()
    return jsonify({'task': row_to_task(updated)})

@tasks_bp.route('/<task_id>/toggle', methods=['POST'])
def toggle_task(task_id):
    import json
    db = get_db()
    row = db.execute('SELECT * FROM tasks WHERE task_id = ? AND user_id = ?', (task_id, g.user_id)).fetchone()
    if not row:
        db.close()
        return jsonify({'error': 'Task not found.'}), 404

    if row['status'] == 'completed':
        db.execute("UPDATE tasks SET status = 'pending', completed_at = NULL WHERE task_id = ?", (task_id,))
    elif row['repeat_type'] != 'none':
        data = request.get_json() or {}
        completions = json.loads(row['instance_completions'] or '{}')
        date_key = data.get('dateKey', datetime.utcnow().strftime('%Y-%m-%d'))
        completions[date_key] = 'completed'
        db.execute('UPDATE tasks SET instance_completions = ? WHERE task_id = ?', (json.dumps(completions), task_id))
    else:
        db.execute("UPDATE tasks SET status = 'completed', completed_at = ? WHERE task_id = ?", (datetime.utcnow().isoformat(), task_id))

    db.commit()
    updated = db.execute('SELECT * FROM tasks WHERE task_id = ?', (task_id,)).fetchone()
    db.close()
    return jsonify({'task': row_to_task(updated)})

@tasks_bp.route('/<task_id>/snooze', methods=['POST'])
def snooze_task(task_id):
    data = request.get_json()
    minutes = data.get('minutes', 0)
    if not minutes or minutes <= 0:
        return jsonify({'error': 'Minutes must be > 0.'}), 400

    db = get_db()
    row = db.execute('SELECT * FROM tasks WHERE task_id = ? AND user_id = ?', (task_id, g.user_id)).fetchone()
    if not row:
        db.close()
        return jsonify({'error': 'Task not found.'}), 404

    due = datetime.fromisoformat(row['due_date'].replace(' ', 'T'))
    from datetime import timedelta
    new_due = due + timedelta(minutes=minutes)
    new_due_str = new_due.strftime('%Y-%m-%d %H:%M:%S')

    db.execute('UPDATE tasks SET snooze_count = snooze_count + 1, due_date = ? WHERE task_id = ?', (new_due_str, task_id))
    db.commit()
    updated = db.execute('SELECT * FROM tasks WHERE task_id = ?', (task_id,)).fetchone()
    db.close()
    return jsonify({'task': row_to_task(updated)})

@tasks_bp.route('/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    db = get_db()
    result = db.execute('DELETE FROM tasks WHERE task_id = ? AND user_id = ?', (task_id, g.user_id))
    db.commit()
    changes = result.rowcount
    db.close()
    if changes == 0:
        return jsonify({'error': 'Task not found.'}), 404
    return jsonify({'message': 'Deleted.'})

@tasks_bp.route('/', methods=['DELETE'])
def delete_all_tasks():
    db = get_db()
    result = db.execute('DELETE FROM tasks WHERE user_id = ?', (g.user_id,))
    db.commit()
    changes = result.rowcount
    db.close()
    return jsonify({'message': f'Deleted {changes} task(s).'})
