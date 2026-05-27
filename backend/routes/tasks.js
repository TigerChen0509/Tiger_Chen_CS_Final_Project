const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { auth } = require('../middleware');

const router = express.Router();

router.use(auth);

function genId() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `t_${datePart}_${crypto.randomBytes(4).toString('hex')}`;
}

function rowToTask(row) {
  return {
    task_id: row.task_id,
    title: row.title,
    notes: row.notes || '',
    due_date: row.due_date,
    created_at: row.created_at,
    repeat: row.repeat_type,
    repeat_end: row.repeat_end,
    status: row.status,
    snooze_count: row.snooze_count,
    alarm_enabled: !!row.alarm_enabled,
    completed_at: row.completed_at,
    instance_completions: JSON.parse(row.instance_completions || '{}'),
    category: row.category,
  };
}

// GET /tasks
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC').all(req.userId);
  res.json({ tasks: rows.map(rowToTask) });
});

// POST /tasks
router.post('/', (req, res) => {
  const { title, notes, due_date, repeat, category } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required.' });
  }
  if (!due_date) {
    return res.status(400).json({ error: 'Due date is required.' });
  }

  const taskId = genId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO tasks (user_id, task_id, title, notes, due_date, created_at, repeat_type, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.userId, taskId, title.trim(), notes || '', due_date, now, repeat || 'none', category || 'General');

  const row = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId);
  res.status(201).json({ task: rowToTask(row) });
});

// PUT /tasks/:taskId
router.put('/:taskId', (req, res) => {
  const row = db.prepare('SELECT * FROM tasks WHERE task_id = ? AND user_id = ?').get(req.params.taskId, req.userId);
  if (!row) return res.status(404).json({ error: 'Task not found.' });

  const { title, notes, due_date, repeat, category, status, alarm_enabled } = req.body;

  const fields = [];
  const values = [];

  if (title !== undefined) { fields.push('title = ?'); values.push(title.trim()); }
  if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
  if (due_date !== undefined) { fields.push('due_date = ?'); values.push(due_date); }
  if (repeat !== undefined) { fields.push('repeat_type = ?'); values.push(repeat); }
  if (category !== undefined) { fields.push('category = ?'); values.push(category); }
  if (status !== undefined) {
    fields.push('status = ?');
    values.push(status);
    if (status === 'completed') { fields.push('completed_at = ?'); values.push(new Date().toISOString()); }
    if (status === 'pending') { fields.push('completed_at = ?'); values.push(null); }
  }
  if (alarm_enabled !== undefined) { fields.push('alarm_enabled = ?'); values.push(alarm_enabled ? 1 : 0); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  values.push(req.params.taskId, req.userId);
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE task_id = ? AND user_id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(req.params.taskId);
  res.json({ task: rowToTask(updated) });
});

// POST /tasks/:taskId/toggle
router.post('/:taskId/toggle', (req, res) => {
  const row = db.prepare('SELECT * FROM tasks WHERE task_id = ? AND user_id = ?').get(req.params.taskId, req.userId);
  if (!row) return res.status(404).json({ error: 'Task not found.' });

  const task = rowToTask(row);

  if (task.status === 'completed') {
    db.prepare("UPDATE tasks SET status = 'pending', completed_at = NULL WHERE task_id = ?").run(row.task_id);
  } else if (task.repeat !== 'none') {
    const { dateKey } = req.body;
    const completions = JSON.parse(row.instance_completions || '{}');
    completions[dateKey || new Date().toISOString().slice(0, 10)] = 'completed';
    db.prepare('UPDATE tasks SET instance_completions = ? WHERE task_id = ?').run(JSON.stringify(completions), row.task_id);
  } else {
    db.prepare("UPDATE tasks SET status = 'completed', completed_at = ? WHERE task_id = ?").run(new Date().toISOString(), row.task_id);
  }

  const updated = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(row.task_id);
  res.json({ task: rowToTask(updated) });
});

// POST /tasks/:taskId/snooze
router.post('/:taskId/snooze', (req, res) => {
  const { minutes } = req.body;
  if (!minutes || minutes <= 0) return res.status(400).json({ error: 'Minutes must be > 0.' });

  const row = db.prepare('SELECT * FROM tasks WHERE task_id = ? AND user_id = ?').get(req.params.taskId, req.userId);
  if (!row) return res.status(404).json({ error: 'Task not found.' });

  const due = new Date(row.due_date);
  due.setMinutes(due.getMinutes() + minutes);
  const newDue = due.toISOString().replace('T', ' ').slice(0, 19);

  db.prepare('UPDATE tasks SET snooze_count = snooze_count + 1, due_date = ? WHERE task_id = ?').run(newDue, row.task_id);

  const updated = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(row.task_id);
  res.json({ task: rowToTask(updated) });
});

// DELETE /tasks/:taskId
router.delete('/:taskId', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE task_id = ? AND user_id = ?').run(req.params.taskId, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found.' });
  res.json({ message: 'Deleted.' });
});

// DELETE /tasks  (delete all for user)
router.delete('/', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE user_id = ?').run(req.userId);
  res.json({ message: `Deleted ${result.changes} task(s).` });
});

module.exports = router;
