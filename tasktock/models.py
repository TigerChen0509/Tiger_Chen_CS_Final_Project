from datetime import datetime
import uuid


def create_task(title: str, due_date: str, notes: str = "", repeat: str = "none", alarm_enabled: bool = True) -> dict:
    """Creates a new task dict with default values."""
    return {
        "task_id": f"t_{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}",
        "title": title,
        "notes": notes,
        "due_date": due_date,
        "created_at": datetime.now().isoformat(),
        "repeat": repeat,
        "repeat_end": None,
        "status": "pending",
        "snooze_count": 0,
        "alarm_enabled": alarm_enabled,
        "completed_at": None,
        "instance_completions": {}
    }
