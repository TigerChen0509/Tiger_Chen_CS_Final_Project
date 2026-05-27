import { Task, TaskStatus, RepeatType, MissedPatternResult, Category } from '../types/task';

function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateKeyFromStored(dateStr: string): string {
  const tIndex = dateStr.indexOf('T');
  if (tIndex === 10) return dateStr.slice(0, 10);
  const d = new Date(dateStr);
  return toLocalDateKey(d);
}

export function addTask(
  tasks: Task[],
  title: string,
  dueDate: string,
  repeat: RepeatType = 'none',
  notes: string = '',
  category: Category = 'General',
): Task | null {
  if (!title.trim()) {
    return null;
  }

  const now = new Date();
  const taskId = `t_${toLocalDateKey(now).replace(/-/g, '')}_${Math.random().toString(36).slice(2, 8)}`;

  const task: Task = {
    task_id: taskId,
    title: title.trim(),
    notes,
    due_date: dueDate,
    created_at: now.toISOString(),
    repeat,
    repeat_end: null,
    status: 'pending',
    snooze_count: 0,
    alarm_enabled: true,
    completed_at: null,
    instance_completions: {},
    category,
  };

  tasks.push(task);
  return task;
}

export function completeTask(tasks: Task[], taskId: string): boolean {
  const task = tasks.find((t) => t.task_id === taskId);
  if (!task) return false;
  if (task.status === 'completed') return true;

  task.status = 'completed';
  task.completed_at = new Date().toISOString();
  return true;
}

export function completeTaskForDate(tasks: Task[], taskId: string, date: string): boolean {
  const task = tasks.find((t) => t.task_id === taskId);
  if (!task) return false;

  if (task.repeat !== 'none') {
    task.instance_completions[date] = 'completed';
  } else {
    task.status = 'completed';
    task.completed_at = new Date().toISOString();
  }
  return true;
}

export function snoozeAlarm(tasks: Task[], taskId: string, minutes: number): boolean {
  if (minutes <= 0) return false;
  const task = tasks.find((t) => t.task_id === taskId);
  if (!task) return false;

  task.snooze_count += 1;

  const newDue = new Date(task.due_date);
  newDue.setMinutes(newDue.getMinutes() + minutes);
  task.due_date = toLocalISO(newDue);

  return true;
}

export function checkMissedPattern(
  tasks: Task[],
  taskId: string,
  threshold: number = 3,
): MissedPatternResult {
  if (threshold <= 0) threshold = 1;

  const task = tasks.find((t) => t.task_id === taskId);
  if (!task) {
    return { flagged: false, suggestion: 'none', message: 'Task not found.' };
  }

  const missCount = task.snooze_count + countMissedInstances(task);

  if (missCount >= threshold) {
    return {
      flagged: true,
      suggestion: 'reschedule',
      message: `This task has been snoozed or missed ${missCount} times. Consider rescheduling or marking it as priority.`,
    };
  }

  return { flagged: false, suggestion: 'none', message: 'Task is on track.' };
}

function countMissedInstances(task: Task): number {
  return Object.values(task.instance_completions).filter((s) => s === 'missed').length;
}

export function recoverAlarms(tasks: Task[]): number {
  const now = new Date();
  const todayKey = toLocalDateKey(now);
  let recovered = 0;

  for (const task of tasks) {
    if (task.status === 'completed') continue;

    const taskDateKey = dateKeyFromStored(task.due_date);

    if (task.status === 'pending' && taskDateKey < todayKey) {
      task.status = 'missed';
      if (task.repeat !== 'none') {
        task.instance_completions[taskDateKey] = 'missed';
      }
    }

    if (task.status === 'pending' && task.alarm_enabled) {
      recovered++;
    }
  }

  return recovered;
}

export function getTodayKey(): string {
  return toLocalDateKey(new Date());
}

export function getTasksForDate(tasks: Task[], dateKey: string): Task[] {
  const result: Task[] = [];

  for (const task of tasks) {
    if (task.repeat === 'none') {
      const taskDateKey = dateKeyFromStored(task.due_date);
      if (taskDateKey === dateKey) {
        result.push(task);
      }
    } else {
      const createdDateKey = dateKeyFromStored(task.created_at);
      if (task.repeat_end && dateKey > task.repeat_end) continue;
      if (dateKey < createdDateKey) continue;

      const instanceStatus = task.instance_completions[dateKey];
      if (instanceStatus !== undefined) {
        result.push({ ...task, status: instanceStatus });
      } else {
        result.push({ ...task, status: 'pending' });
      }
    }
  }

  return result;
}

export type DayStatus = 'none' | 'completed' | 'missed' | 'mixed';

export function getDayStatus(tasks: Task[], dateKey: string): DayStatus {
  const dayTasks = getTasksForDate(tasks, dateKey);
  if (dayTasks.length === 0) return 'none';

  const completed = dayTasks.filter((t) => t.status === 'completed').length;
  const missed = dayTasks.filter((t) => t.status === 'missed').length;

  if (completed === dayTasks.length) return 'completed';
  if (missed === dayTasks.length) return 'missed';
  if (completed > 0 || missed > 0) return 'mixed';
  return 'none';
}

export function getMonthStats(tasks: Task[], year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let completed = 0;
  let missed = 0;
  let total = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTasks = getTasksForDate(tasks, dateKey);
    for (const t of dayTasks) {
      total++;
      if (t.status === 'completed') completed++;
      if (t.status === 'missed') missed++;
    }
  }

  return { completed, missed, total };
}
