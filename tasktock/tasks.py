"""TaskTock core business logic — all 7 PRD functions."""

import json
import uuid
from datetime import datetime, timedelta


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_id() -> str:
    return f"t_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:4]}"


def _parse_due(due_date: str) -> datetime:
    """Accept 'YYYY-MM-DD HH:MM' or 'YYYY-MM-DDTHH:MM:SS'."""
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(due_date, fmt)
        except ValueError:
            continue
    raise ValueError("Invalid date format. Please use YYYY-MM-DD HH:MM.")


# ── 1. add_task ────────────────────────────────────────────────────────────────

def add_task(tasks: list, title: str, due_date: str,
             repeat: str = "none", notes: str = "") -> dict:
    """Adds a new task to the task list. Optionally repeats daily or weekly."""
    title = title.strip()
    if not title:
        raise ValueError("Task title cannot be empty. Please enter a name.")

    due_dt = _parse_due(due_date)
    date_key = due_dt.strftime("%Y-%m-%d")

    for t in tasks:
        if t["title"].lower() == title.lower() and t["due_date"].startswith(date_key):
            raise ValueError(
                f"Task already exists for today. Do you want to create a duplicate?"
            )

    task = {
        "task_id": _make_id(),
        "title": title,
        "notes": notes.strip(),
        "due_date": due_dt.strftime("%Y-%m-%dT%H:%M:%S"),
        "created_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "repeat": repeat if repeat in {"none", "daily", "weekly"} else "none",
        "status": "pending",
        "snooze_count": 0,
        "alarm_enabled": True,
        "completed_at": None,
        "instance_completions": {},
    }
    tasks.append(task)
    return task


# ── 2. complete_task ───────────────────────────────────────────────────────────

def complete_task(tasks: list, task_id: str) -> bool:
    """Marks a task as completed."""
    for task in tasks:
        if task["task_id"] == task_id:
            if task["status"] == "completed":
                return True
            task["status"] = "completed"
            task["completed_at"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
            return True
    return False


# ── 3. snooze_alarm ───────────────────────────────────────────────────────────

def snooze_alarm(tasks: list, task_id: str, minutes: int) -> bool:
    """Delays the alarm for a task by a specified number of minutes."""
    if minutes <= 0:
        raise ValueError("Invalid snooze time. Enter a number greater than 0.")
    for task in tasks:
        if task["task_id"] == task_id:
            due_dt = datetime.strptime(task["due_date"], "%Y-%m-%dT%H:%M:%S")
            task["due_date"] = (due_dt + timedelta(minutes=minutes)).strftime(
                "%Y-%m-%dT%H:%M:%S"
            )
            task["snooze_count"] = task.get("snooze_count", 0) + 1
            task["status"] = "pending"
            return True
    return False


# ── 4. save_tasks ─────────────────────────────────────────────────────────────

def save_tasks(tasks: list, filename: str) -> None:
    """Saves all tasks to a JSON file for persistence."""
    try:
        with open(filename, "w") as f:
            json.dump(tasks, f, indent=2)
    except IOError as e:
        print(f"Error saving tasks: {e}. Please check file permissions.")


# ── 5. load_tasks ─────────────────────────────────────────────────────────────

def load_tasks(filename: str) -> list:
    """Loads tasks from a JSON file into the program."""
    try:
        with open(filename, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return []
    except Exception:
        print("No saved tasks found or file corrupted. Starting fresh.")
        return []


# ── 6. check_missed_pattern ───────────────────────────────────────────────────

def check_missed_pattern(tasks: list, task_id: str, threshold: int = 3) -> dict:
    """Analyzes snooze/miss history and returns a suggestion.

    Returns {"flagged": bool, "suggestion": str, "message": str}.
    """
    if threshold <= 0:
        threshold = 1
    for task in tasks:
        if task["task_id"] == task_id:
            missed = 1 if task.get("status") == "missed" else 0
            score = task.get("snooze_count", 0) + missed
            if score >= threshold:
                return {
                    "flagged": True,
                    "suggestion": "reschedule",
                    "message": (
                        f"'{task['title']}' has been snoozed or missed {score} times. "
                        "Consider rescheduling or marking it as a priority."
                    ),
                }
            return {
                "flagged": False,
                "suggestion": "none",
                "message": f"No pattern detected for '{task['title']}'.",
            }
    return {"flagged": False, "suggestion": "none", "message": "Task not found."}


# ── 7. recover_alarms ─────────────────────────────────────────────────────────

def recover_alarms(tasks: list) -> int:
    """Re-schedules pending alarms and flags overdue tasks as missed on startup.

    Returns the number of future alarms recovered.
    """
    now = datetime.now()
    recovered = 0
    for task in tasks:
        if task["status"] != "pending":
            continue
        try:
            due_dt = datetime.strptime(task["due_date"], "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            continue
        if due_dt < now:
            task["status"] = "missed"
        else:
            recovered += 1
    return recovered
