export type TaskStatus = 'pending' | 'completed' | 'missed';
export type RepeatType = 'none' | 'daily' | 'weekly';
export type Category = 'General' | 'Math' | 'CS' | 'English' | 'Science' | 'Language' | 'Personal' | 'Work';

export const CATEGORIES: { label: string; value: Category; color: string }[] = [
  { label: 'General', value: 'General', color: '#6c5ce7' },
  { label: 'Math', value: 'Math', color: '#e17055' },
  { label: 'CS', value: 'CS', color: '#00b894' },
  { label: 'English', value: 'English', color: '#fdcb6e' },
  { label: 'Science', value: 'Science', color: '#0984e3' },
  { label: 'Language', value: 'Language', color: '#e84393' },
  { label: 'Personal', value: 'Personal', color: '#00cec9' },
  { label: 'Work', value: 'Work', color: '#636e72' },
];

export function getCategoryColor(cat: Category): string {
  return CATEGORIES.find((c) => c.value === cat)?.color ?? '#6c5ce7';
}

export interface Task {
  task_id: string;
  title: string;
  notes: string;
  due_date: string; // ISO 8601
  created_at: string; // ISO 8601
  repeat: RepeatType;
  repeat_end: string | null; // ISO 8601 date
  status: TaskStatus;
  snooze_count: number;
  alarm_enabled: boolean;
  completed_at: string | null; // ISO 8601
  instance_completions: Record<string, TaskStatus>; // date string -> status
  category: Category;
}

export interface MissedPatternResult {
  flagged: boolean;
  suggestion: string;
  message: string;
}
