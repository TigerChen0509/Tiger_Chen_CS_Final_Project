# TaskTock — Grill Session

Date: 2026-05-15

---

## 1. PROJECT IDENTITY

**Project:** TaskTock — a daily reminder + checklist app with alarms.

**Primary User:** 18–25-year-old college student who struggles with time management and forgets assignments or deadlines. They need a simple way to organize daily tasks and build consistent habits. They're already on their phone frequently, so push notifications fit naturally. College provides structured recurring deadlines (classes, homework, exams), making daily reminders and monthly progress tracking especially useful.

**Why this user:** Managing multiple academic tasks while balancing social and personal life is a real, concrete problem. This user benefits from both immediate reminders and long-term progress tracking.

---

## 2. FEATURE SCOPE

### MVP Features (ship in 2 weeks)

| Feature | What It Does | Why It Matters |
|---|---|---|
| **Daily Task Reminders** | Push notifications and alarms for scheduled tasks | Core value: remind students of tasks at the right time |
| **Repeating Tasks** | Tasks repeat daily, weekly, or custom intervals | Recurring deadlines auto-scheduled without re-entry |
| **Snooze & Smart Reminders** | Configurable snooze + pattern detection for repeatedly missed tasks | Completes the reminder loop: create → get notified → take action |

### Cut to v2

| Feature | Why Cut |
|---|---|
| **Monthly Progress Overview** | Motivational, not functional. Students need alarms first, charts later. |
| **Notes & Attachments** | Adds storage, file handling, and UI complexity. Phone-native notes apps suffice. |

### Feature Details

#### Daily Task Reminders
- **User Flow:**
  1. User opens TaskTock → taps "Add Task."
  2. Inputs task name, date, time, and optional notes.
  3. Confirms → TaskTock schedules alarm/notification.
  4. At scheduled time → notification appears with "Mark Complete" or "Snooze."
- **Edge Cases:**
  - Multiple tasks at same time → queue/stack notifications without crashing.
  - Device offline → schedule alarms locally, sync later.

#### Repeating Tasks
- **User Flow:**
  1. User adds task → selects "Repeat."
  2. Chooses frequency → app schedules future alarms.
  3. User can modify or cancel repeat at any time.
- **Edge Cases:**
  - Edit one occurrence → "edit this instance only" vs. "edit all future."
  - Time zone change → repeating tasks adjust to new local time.

#### Snooze & Smart Reminders
- **User Flow:**
  1. Alarm goes off → user taps "Snooze" or "Dismiss."
  2. If missed multiple times → app suggests rescheduling or marking priority.
- **Edge Cases:**
  - Repeated snooze beyond end of day → warn user of pending tasks.
  - User disables notifications → log tasks as pending without alarm.

---

## 3. DATA ARCHITECTURE

### Data Stored
- Users
- Tasks
- Alarms & Notifications
- Progress metrics

### Data Flow
1. User creates task → stored in JSON/database → alarm scheduled locally and/or on server.
2. Alarm triggers → app updates "completed" status on dismissal or snooze.
3. Monthly → app aggregates completed vs missed tasks into progress.
4. Sync occurs if app offline → updates server when online.

### Task JSON Schema

```json
{
  "task_id": "t_20260515_001",
  "title": "Submit CS101 Lab 5",
  "notes": "Binary search tree implementation, submit on Canvas",
  "due_date": "2026-05-16T23:59:00",
  "created_at": "2026-05-15T10:30:00",
  "repeat": "none",
  "status": "pending",
  "snooze_count": 0,
  "alarm_enabled": true,
  "completed_at": null
}
```

**Key design choices:**
- `task_id` uses timestamp + sequence for uniqueness without a database.
- `status` enum: `pending`, `completed`, `missed` — feeds progress tracking.
- `snooze_count` tracks snooze history for smart reminder logic.
- `completed_at` is null until done — enables late-completion analytics.

### Repeating Tasks Model

One parent task with `instance_completions` dict — no pre-generation:

```json
{
  "task_id": "t_20260515_002",
  "title": "Review Spanish Vocabulary",
  "due_date": "2026-05-15T08:00:00",
  "repeat": "daily",
  "repeat_end": "2026-06-15",
  "status": "pending",
  "instance_completions": {
    "2026-05-15": "completed",
    "2026-05-16": "missed",
    "2026-05-17": "pending"
  }
}
```

**Why this approach:**
- One record per repeating task = no database bloat.
- `instance_completions` keyed by date for independent day tracking.
- `repeat_end` prevents infinite generation (semester ends).
- "Edit this instance only" = add override entry; "Edit all" = modify parent.

---

## 4. FUNCTION SPECIFICATIONS

### 1. `add_task`
- **Parameters:** `tasks (list)`, `title (str)`, `due_date (str)`, `repeat (str or None)`
- **Return Type:** `dict` (the new task)
- **Docstring:** Adds a new task to the task list. Optionally repeats daily or weekly.
- **Edge Cases:**
  1. Title is empty → reject task.
  2. Duplicate task title on same date → warn user.

### 2. `complete_task`
- **Parameters:** `tasks (list)`, `task_id (str)`
- **Return Type:** `bool`
- **Docstring:** Marks a task as completed.
- **Edge Cases:**
  1. Task ID does not exist → return False.
  2. Task already completed → return True, no change.

### 3. `snooze_alarm`
- **Parameters:** `tasks (list)`, `task_id (str)`, `minutes (int)`
- **Return Type:** `bool`
- **Docstring:** Delays the alarm for a task by a specified number of minutes.
- **Edge Cases:**
  1. Task ID not found → return False.
  2. Minutes ≤ 0 → reject input.

### 4. `save_tasks`
- **Parameters:** `tasks (list)`, `filename (str)`
- **Return Type:** `None`
- **Docstring:** Saves all tasks to a JSON file for persistence.
- **Edge Cases:**
  1. File cannot be written → print error message.
  2. Task list is empty → still saves valid empty JSON.

### 5. `load_tasks`
- **Parameters:** `filename (str)`
- **Return Type:** `list`
- **Docstring:** Loads tasks from a JSON file into the program.
- **Edge Cases:**
  1. File not found → return empty list.
  2. File corrupted → return empty list with warning.

### 6. `check_missed_pattern`
- **Parameters:** `tasks (list)`, `task_id (str)`, `threshold (int = 3)`
- **Return Type:** `dict`
- **Docstring:** Analyzes snooze/miss history for a task and returns a suggestion. If a task has been snoozed or missed >= threshold times, returns a recommendation to reschedule or reprioritize.
- **Returns:** `{"flagged": bool, "suggestion": str, "message": str}`
- **Edge Cases:**
  1. Task doesn't exist → return `{"flagged": False, "suggestion": "none", "message": "Task not found."}`
  2. Threshold is 0 or negative → treat as 1.

### 7. `recover_alarms`
- **Parameters:** `tasks (list)`
- **Return Type:** `int` (number of alarms recovered)
- **Docstring:** On app startup, re-schedules all pending alarms for future tasks. Flags tasks whose due date passed while app was inactive as 'missed'.
- **Edge Cases:**
  1. No tasks in list → return 0.
  2. All tasks already completed or missed → return 0, no alarms scheduled.

---

## 5. UI / INTERACTION DESIGN

### Screen 1: Home

```
TaskTock

[ ] Finish Math Homework
[ ] Practice Golf Swing
[ ] Call Mom

+ Add Task → goes to Add Task screen
Progress → goes to Progress screen
Settings → goes to Settings screen
```

**Empty state (no tasks):**
```
TaskTock

No tasks for today.

+ Add Task → goes to Add Task screen
Progress → goes to Progress screen
Settings → goes to Settings screen
```

### Screen 2: Add Task

```
Add New Task

Task Title: [_________]
Notes (optional): [_________]
Due Date & Time: [YYYY-MM-DD HH:MM]
Repeat: [None / Daily / Weekly]

Save → saves task and returns to Home
Cancel → returns to Home without saving
```

### Screen 3: Task Detail (tap existing task)

```
Task Detail

Title: Submit CS101 Lab 5
Notes: Binary search tree implementation, submit on Canvas
Due: 2026-05-16 23:59
Repeat: None
Status: Pending

[Edit]  [Delete]  [Mark Complete]
```

- **Edit** → opens Add Task screen pre-filled, Save overwrites.
- **Delete** → confirmation: `"Delete 'Submit CS101 Lab 5'? This cannot be undone."` [Cancel] [Delete]
- **Mark Complete** → returns to Home, checkbox checked.

### Screen 4: Progress (v2)

```
Monthly Progress

Calendar with colored dots:
  Green = Completed
  Red = Missed

Tap day → show tasks for that day

"You completed 18 tasks and missed 2 tasks this month."
```

### Screen 5: Settings

```
Settings

Notification Preferences → enable/disable alarms
Timezone → select timezone
Account Info → view email, username
Save Settings
```

### Pop-up / Alarm Notification

```
Task Due: Finish Math Homework

[Mark Complete]  [Snooze 5 min]  [Dismiss]
```

---

## 6. ERROR HANDLING

| Error | Problem | Response |
|---|---|---|
| Empty Task Title | User creates task without title | "Task title cannot be empty. Please enter a name." |
| Duplicate Task | Same title on same day | "Task already exists for today. Do you want to create a duplicate?" |
| Invalid Date | Wrong date format | "Invalid date format. Please use YYYY-MM-DD HH:MM." |
| Alarm Scheduling Fails | OS notification error | "Unable to schedule alarm. Task saved but no notification set." |
| File Save/Load Error | File I/O failure | "Error saving tasks. Please check file permissions." / "No saved tasks found or file corrupted. Starting fresh." |
| Negative Snooze | Minutes ≤ 0 | "Invalid snooze time. Enter a number greater than 0." |
| Task Not Found | Invalid task_id | "Task not found. Please refresh your task list." |
| App Killed/Restarted | Alarms lost | `recover_alarms()` runs on launch, re-schedules pending, flags missed. Notify: "You missed N tasks while TaskTock was closed. View them?" |

---

## 7. TESTING PLAN

### Test Case 1: Add Task & Trigger Alarm
- **Purpose:** New task added, alarm triggers correctly.
- **Steps:**
  1. Open TaskTock → Add Task.
  2. Enter title: "Finish Homework", due: 5 minutes from now, repeat: None.
  3. Save → return to Home.
  4. Wait for alarm notification.
- **Expected:** Task on Home. Alarm at correct time with [Mark Complete] [Snooze] [Dismiss].

### Test Case 2: Complete Task & Check Progress
- **Purpose:** Marking complete updates progress.
- **Steps:**
  1. From Home, tap [Mark Complete] on a task.
  2. Go to Progress → check calendar for today.
- **Expected:** Checkbox checked. Green dot on calendar.

### Test Case 3: Repeat Task
- **Purpose:** Repeating tasks scheduled correctly.
- **Steps:**
  1. Add task with repeat = "daily" → save.
  2. Check Home for today and tomorrow (simulate next day).
- **Expected:** Task on both days. Alarms scheduled each day.

### Test Case 4: App Recovery After Kill
- **Purpose:** Missed tasks flagged correctly on relaunch.
- **Steps:**
  1. Add task due 2 minutes from now.
  2. Force-kill the app.
  3. Wait 3 minutes (task due time passes).
  4. Relaunch TaskTock.
- **Expected:** Task shows status `missed`. Notification: "You missed 1 task while TaskTock was closed. View them?" Progress shows red dot for today.

**Testing note:** Don't wait real time. Set due time to 1 minute from now, or mock the clock in automated tests.

---

## Summary of Decisions

| Section | Decision |
|---|---|
| Identity | 18-25 college student, time management |
| Features (MVP) | Daily Reminders, Repeating Tasks, Snooze & Smart Reminders |
| Features (v2) | Monthly Progress, Notes & Attachments |
| Data Model | Single task schema with `instance_completions` for repeats |
| Functions | Added `check_missed_pattern()` and `recover_alarms()` |
| UI | Added empty state, task detail screen with edit/delete |
| Error Handling | Added app recovery on launch |
| Testing | Added recovery test case, mock clock for alarm tests |
