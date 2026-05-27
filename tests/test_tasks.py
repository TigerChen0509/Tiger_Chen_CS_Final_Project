"""Unit tests for all 7 PRD functions."""

import sys
import os
import tempfile
import json
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from tasktock.tasks import (
    add_task,
    check_missed_pattern,
    complete_task,
    load_tasks,
    recover_alarms,
    save_tasks,
    snooze_alarm,
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _future(minutes: int = 60) -> str:
    return (datetime.now() + timedelta(minutes=minutes)).strftime("%Y-%m-%d %H:%M")


def _past(minutes: int = 60) -> str:
    return (datetime.now() - timedelta(minutes=minutes)).strftime("%Y-%m-%d %H:%M")


# ── add_task ──────────────────────────────────────────────────────────────────


def test_add_task_basic():
    tasks = []
    t = add_task(tasks, "Study Python", _future())
    assert t["title"] == "Study Python"
    assert t["status"] == "pending"
    assert len(tasks) == 1


def test_add_task_empty_title():
    try:
        add_task([], "  ", _future())
        assert False, "Should have raised"
    except ValueError as e:
        assert "empty" in str(e).lower()


def test_add_task_bad_date():
    try:
        add_task([], "Task", "not-a-date")
        assert False, "Should have raised"
    except ValueError as e:
        assert "invalid date" in str(e).lower()


def test_add_task_duplicate_same_day():
    tasks = []
    add_task(tasks, "Duplicate", _future())
    try:
        add_task(tasks, "Duplicate", _future())
        assert False, "Should have raised"
    except ValueError as e:
        assert "already exists" in str(e).lower()


def test_add_task_repeat_stored():
    tasks = []
    t = add_task(tasks, "Daily task", _future(), repeat="daily")
    assert t["repeat"] == "daily"


def test_add_task_invalid_repeat_defaults_none():
    tasks = []
    t = add_task(tasks, "Bad repeat", _future(), repeat="monthly")
    assert t["repeat"] == "none"


# ── complete_task ─────────────────────────────────────────────────────────────


def test_complete_task():
    tasks = []
    t = add_task(tasks, "Finish lab", _future())
    result = complete_task(tasks, t["task_id"])
    assert result is True
    assert tasks[0]["status"] == "completed"
    assert tasks[0]["completed_at"] is not None


def test_complete_task_already_completed():
    tasks = []
    t = add_task(tasks, "Already done", _future())
    complete_task(tasks, t["task_id"])
    result = complete_task(tasks, t["task_id"])
    assert result is True
    assert tasks[0]["status"] == "completed"


def test_complete_task_not_found():
    result = complete_task([], "nonexistent_id")
    assert result is False


# ── snooze_alarm ──────────────────────────────────────────────────────────────


def test_snooze_alarm():
    tasks = []
    t = add_task(tasks, "Snooze me", _future(10))
    original_due = tasks[0]["due_date"]
    result = snooze_alarm(tasks, t["task_id"], 5)
    assert result is True
    assert tasks[0]["snooze_count"] == 1
    assert tasks[0]["due_date"] != original_due


def test_snooze_alarm_zero_minutes():
    tasks = []
    t = add_task(tasks, "Task", _future())
    try:
        snooze_alarm(tasks, t["task_id"], 0)
        assert False, "Should have raised"
    except ValueError as e:
        assert "greater than 0" in str(e).lower()


def test_snooze_alarm_negative():
    tasks = []
    t = add_task(tasks, "Task", _future())
    try:
        snooze_alarm(tasks, t["task_id"], -5)
        assert False, "Should have raised"
    except ValueError:
        pass


def test_snooze_alarm_not_found():
    result = snooze_alarm([], "bad_id", 5)
    assert result is False


# ── save_tasks / load_tasks ───────────────────────────────────────────────────


def test_save_and_load_roundtrip():
    tasks = []
    add_task(tasks, "Roundtrip task", _future(), notes="test note")
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
        fname = f.name
    try:
        save_tasks(tasks, fname)
        loaded = load_tasks(fname)
        assert len(loaded) == 1
        assert loaded[0]["title"] == "Roundtrip task"
        assert loaded[0]["notes"] == "test note"
    finally:
        os.unlink(fname)


def test_load_tasks_missing_file():
    result = load_tasks("/tmp/tasktock_does_not_exist_xyz.json")
    assert result == []


def test_save_tasks_empty_list():
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
        fname = f.name
    try:
        save_tasks([], fname)
        loaded = load_tasks(fname)
        assert loaded == []
    finally:
        os.unlink(fname)


def test_load_tasks_corrupted_file():
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
        f.write("this is not json {{{{")
        fname = f.name
    try:
        result = load_tasks(fname)
        assert result == []
    finally:
        os.unlink(fname)


# ── check_missed_pattern ──────────────────────────────────────────────────────


def test_check_missed_pattern_not_flagged():
    tasks = []
    t = add_task(tasks, "Low snooze task", _future())
    tasks[0]["snooze_count"] = 1
    result = check_missed_pattern(tasks, t["task_id"], threshold=3)
    assert result["flagged"] is False
    assert result["suggestion"] == "none"


def test_check_missed_pattern_flagged():
    tasks = []
    t = add_task(tasks, "High snooze task", _future())
    tasks[0]["snooze_count"] = 3
    result = check_missed_pattern(tasks, t["task_id"], threshold=3)
    assert result["flagged"] is True
    assert result["suggestion"] == "reschedule"
    assert "High snooze task" in result["message"]


def test_check_missed_pattern_task_not_found():
    result = check_missed_pattern([], "bad_id")
    assert result["flagged"] is False
    assert result["message"] == "Task not found."


def test_check_missed_pattern_zero_threshold():
    tasks = []
    t = add_task(tasks, "Zero threshold", _future())
    tasks[0]["snooze_count"] = 0
    # threshold=0 treated as 1; snooze_count=0 + missed=0 = 0 < 1 → not flagged
    result = check_missed_pattern(tasks, t["task_id"], threshold=0)
    assert result["flagged"] is False


def test_check_missed_pattern_missed_status_counts():
    tasks = []
    t = add_task(tasks, "Missed task", _past())
    tasks[0]["status"] = "missed"
    tasks[0]["snooze_count"] = 2
    result = check_missed_pattern(tasks, t["task_id"], threshold=3)
    assert result["flagged"] is True  # 2 snooze + 1 missed = 3


# ── recover_alarms ────────────────────────────────────────────────────────────


def test_recover_alarms_flags_overdue():
    tasks = []
    add_task(tasks, "Overdue task", _future())
    # Force due_date to the past
    tasks[0]["due_date"] = (datetime.now() - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%S")
    recovered = recover_alarms(tasks)
    assert recovered == 0
    assert tasks[0]["status"] == "missed"


def test_recover_alarms_keeps_future():
    tasks = []
    add_task(tasks, "Future task", _future(120))
    recovered = recover_alarms(tasks)
    assert recovered == 1
    assert tasks[0]["status"] == "pending"


def test_recover_alarms_empty_list():
    assert recover_alarms([]) == 0


def test_recover_alarms_skips_completed():
    tasks = []
    add_task(tasks, "Done task", _future())
    tasks[0]["status"] = "completed"
    tasks[0]["due_date"] = (datetime.now() - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S")
    recovered = recover_alarms(tasks)
    assert recovered == 0
    assert tasks[0]["status"] == "completed"  # unchanged


# ── Run all ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import traceback

    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    passed = failed = 0
    for fn in tests:
        try:
            fn()
            print(f"  PASS  {fn.__name__}")
            passed += 1
        except Exception:
            print(f"  FAIL  {fn.__name__}")
            traceback.print_exc()
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
