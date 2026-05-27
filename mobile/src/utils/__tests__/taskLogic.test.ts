import {
  addTask,
  completeTask,
  snoozeAlarm,
  checkMissedPattern,
  recoverAlarms,
  getTasksForDate,
  getTodayKey,
  completeTaskForDate,
} from '../taskLogic';
import { Task } from '../../types/task';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    task_id: 't_test_001',
    title: 'Test Task',
    notes: '',
    due_date: '2026-05-20T10:00:00',
    created_at: '2026-05-19T08:00:00',
    repeat: 'none',
    repeat_end: null,
    status: 'pending',
    snooze_count: 0,
    alarm_enabled: true,
    completed_at: null,
    instance_completions: {},
    category: 'General',
    ...overrides,
  };
}

describe('addTask', () => {
  it('adds a task to the list', () => {
    const tasks: Task[] = [];
    const result = addTask(tasks, 'Do homework', '2026-05-20T10:00:00');
    expect(result).not.toBeNull();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Do homework');
    expect(tasks[0].status).toBe('pending');
  });

  it('rejects empty title', () => {
    const tasks: Task[] = [];
    const result = addTask(tasks, '', '2026-05-20T10:00:00');
    expect(result).toBeNull();
    expect(tasks).toHaveLength(0);
  });

  it('rejects whitespace-only title', () => {
    const tasks: Task[] = [];
    const result = addTask(tasks, '   ', '2026-05-20T10:00:00');
    expect(result).toBeNull();
  });

  it('sets repeat type', () => {
    const tasks: Task[] = [];
    addTask(tasks, 'Daily task', '2026-05-20T10:00:00', 'daily');
    expect(tasks[0].repeat).toBe('daily');
  });
});

describe('completeTask', () => {
  it('marks a task as completed', () => {
    const tasks = [makeTask()];
    const result = completeTask(tasks, 't_test_001');
    expect(result).toBe(true);
    expect(tasks[0].status).toBe('completed');
    expect(tasks[0].completed_at).not.toBeNull();
  });

  it('returns true for already completed task', () => {
    const tasks = [makeTask({ status: 'completed' })];
    const result = completeTask(tasks, 't_test_001');
    expect(result).toBe(true);
  });

  it('returns false for non-existent task', () => {
    const tasks = [makeTask()];
    const result = completeTask(tasks, 'nonexistent');
    expect(result).toBe(false);
  });
});

describe('snoozeAlarm', () => {
  it('increments snooze_count and updates due_date', () => {
    const tasks = [makeTask()];
    const result = snoozeAlarm(tasks, 't_test_001', 10);
    expect(result).toBe(true);
    expect(tasks[0].snooze_count).toBe(1);
  });

  it('rejects minutes <= 0', () => {
    const tasks = [makeTask()];
    expect(snoozeAlarm(tasks, 't_test_001', 0)).toBe(false);
    expect(snoozeAlarm(tasks, 't_test_001', -5)).toBe(false);
  });

  it('returns false for non-existent task', () => {
    const tasks = [makeTask()];
    expect(snoozeAlarm(tasks, 'nonexistent', 10)).toBe(false);
  });
});

describe('checkMissedPattern', () => {
  it('flags task with snooze_count >= threshold', () => {
    const tasks = [makeTask({ snooze_count: 3 })];
    const result = checkMissedPattern(tasks, 't_test_001', 3);
    expect(result.flagged).toBe(true);
    expect(result.suggestion).toBe('reschedule');
  });

  it('does not flag task below threshold', () => {
    const tasks = [makeTask({ snooze_count: 1 })];
    const result = checkMissedPattern(tasks, 't_test_001', 3);
    expect(result.flagged).toBe(false);
  });

  it('returns not found for missing task', () => {
    const result = checkMissedPattern([], 'nonexistent');
    expect(result.flagged).toBe(false);
    expect(result.message).toBe('Task not found.');
  });

  it('treats threshold <= 0 as 1', () => {
    const tasks = [makeTask({ snooze_count: 1 })];
    const result = checkMissedPattern(tasks, 't_test_001', 0);
    expect(result.flagged).toBe(true);
  });
});

describe('recoverAlarms', () => {
  it('flags past-due pending tasks as missed', () => {
    const tasks = [
      makeTask({ task_id: 'past', due_date: '2020-01-01T00:00:00', status: 'pending' }),
    ];
    const recovered = recoverAlarms(tasks);
    expect(tasks[0].status).toBe('missed');
    expect(recovered).toBe(0);
  });

  it('counts future pending tasks with alarms enabled', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);
    const tasks = [
      makeTask({ task_id: 'future', due_date: futureDate.toISOString(), status: 'pending' }),
    ];
    const recovered = recoverAlarms(tasks);
    expect(recovered).toBe(1);
  });

  it('returns 0 for empty list', () => {
    expect(recoverAlarms([])).toBe(0);
  });

  it('skips completed tasks', () => {
    const tasks = [makeTask({ status: 'completed' })];
    expect(recoverAlarms(tasks)).toBe(0);
  });
});

describe('getTasksForDate', () => {
  it('returns non-repeating tasks on matching date', () => {
    const tasks = [makeTask({ due_date: '2026-05-20T10:00:00' })];
    const result = getTasksForDate(tasks, '2026-05-20');
    expect(result).toHaveLength(1);
  });

  it('excludes non-repeating tasks on different date', () => {
    const tasks = [makeTask({ due_date: '2026-05-20T10:00:00' })];
    const result = getTasksForDate(tasks, '2026-05-21');
    expect(result).toHaveLength(0);
  });

  it('returns repeating tasks for dates after creation', () => {
    const tasks = [
      makeTask({
        repeat: 'daily',
        created_at: '2026-05-19T08:00:00',
        due_date: '2026-05-19T10:00:00',
      }),
    ];
    const result = getTasksForDate(tasks, '2026-05-20');
    expect(result).toHaveLength(1);
  });

  it('excludes repeating tasks past repeat_end', () => {
    const tasks = [
      makeTask({
        repeat: 'daily',
        created_at: '2026-05-19T08:00:00',
        due_date: '2026-05-19T10:00:00',
        repeat_end: '2026-05-19',
      }),
    ];
    const result = getTasksForDate(tasks, '2026-05-20');
    expect(result).toHaveLength(0);
  });

  it('uses instance_completions status for repeating tasks', () => {
    const tasks = [
      makeTask({
        repeat: 'daily',
        created_at: '2026-05-19T08:00:00',
        due_date: '2026-05-19T10:00:00',
        instance_completions: { '2026-05-20': 'completed' },
      }),
    ];
    const result = getTasksForDate(tasks, '2026-05-20');
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('completed');
  });
});

describe('completeTaskForDate', () => {
  it('marks repeating task instance as completed', () => {
    const tasks = [makeTask({ repeat: 'daily' })];
    completeTaskForDate(tasks, 't_test_001', '2026-05-20');
    expect(tasks[0].instance_completions['2026-05-20']).toBe('completed');
  });

  it('marks non-repeating task as completed', () => {
    const tasks = [makeTask({ repeat: 'none' })];
    completeTaskForDate(tasks, 't_test_001', '2026-05-20');
    expect(tasks[0].status).toBe('completed');
    expect(tasks[0].completed_at).not.toBeNull();
  });
});
