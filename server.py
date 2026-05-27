#!/usr/bin/env python3
"""TaskTock — Flask web server."""

from flask import Flask, redirect, render_template, request, jsonify, url_for
from datetime import datetime

from tasktock.tasks import (
    add_task,
    check_missed_pattern,
    complete_task,
    load_tasks,
    recover_alarms,
    save_tasks,
    snooze_alarm,
)

TASKS_FILE = "tasks.json"
app = Flask(__name__)

# ── Startup ───────────────────────────────────────────────────────────────────

tasks: list = load_tasks(TASKS_FILE)
missed_on_boot: int = recover_alarms(tasks)
save_tasks(tasks, TASKS_FILE)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_task(task_id: str):
    return next((t for t in tasks if t["task_id"] == task_id), None)


def _fmt_due(iso: str) -> str:
    try:
        return datetime.strptime(iso, "%Y-%m-%dT%H:%M:%S").strftime("%b %d, %Y · %I:%M %p")
    except ValueError:
        return iso


def _due_info(iso: str) -> dict:
    """Return a smart relative label + urgency CSS class for a due date."""
    try:
        due  = datetime.strptime(iso, "%Y-%m-%dT%H:%M:%S")
        now  = datetime.now()
        diff = (due - now).total_seconds()
        days = (due.date() - now.date()).days
        t    = due.strftime("%I:%M %p").lstrip("0") or "12:00 AM"

        if diff < 0:
            hrs = abs(diff) / 3600
            if hrs < 1:
                label, cls = f"Overdue · {int(abs(diff) / 60)}m ago", "overdue"
            elif hrs < 24:
                label, cls = f"Overdue · {int(hrs)}h ago", "overdue"
            else:
                label, cls = f"Overdue · {due.strftime('%b %d')}", "overdue"
        elif diff < 3600:
            label, cls = f"Due in {max(1, int(diff / 60))} min", "urgent"
        elif days == 0:
            label, cls = f"Today · {t}", "today"
        elif days == 1:
            label, cls = f"Tomorrow · {t}", "tomorrow"
        elif days < 7:
            label, cls = f"{due.strftime('%A')} · {t}", "week"
        else:
            label, cls = f"{due.strftime('%b %d')} · {t}", "future"

        return {"label": label, "cls": cls}
    except ValueError:
        return {"label": iso, "cls": "future"}


def _stats() -> dict:
    today = datetime.now().strftime("%Y-%m-%d")
    return {
        "total":      len(tasks),
        "pending":    sum(1 for t in tasks if t["status"] == "pending"),
        "done_today": sum(1 for t in tasks if t["status"] == "completed"
                          and (t.get("completed_at") or "").startswith(today)),
        "missed":     sum(1 for t in tasks if t["status"] == "missed"),
    }


# ── Page routes ───────────────────────────────────────────────────────────────

@app.route("/")
def home():
    pending = [t for t in tasks if t["status"] == "pending"]
    others  = [t for t in tasks if t["status"] != "pending"]
    return render_template(
        "home.html",
        pending=pending,
        others=others,
        stats=_stats(),
        missed_on_boot=missed_on_boot,
        due_info=_due_info,
        now_str=datetime.now().strftime("%A, %b %d"),
    )


@app.route("/add", methods=["GET", "POST"])
def add():
    error = None
    if request.method == "POST":
        title  = request.form.get("title", "").strip()
        notes  = request.form.get("notes", "").strip()
        date_s = request.form.get("due_date", "").strip()
        time_s = request.form.get("due_time", "").strip()
        repeat = request.form.get("repeat", "none")
        try:
            add_task(tasks, title, f"{date_s} {time_s}", repeat, notes)
            save_tasks(tasks, TASKS_FILE)
            return redirect(url_for("home"))
        except ValueError as exc:
            error = str(exc)
    return render_template("add_task.html", error=error,
                           today=datetime.now().strftime("%Y-%m-%d"), task=None)


@app.route("/edit/<task_id>", methods=["GET", "POST"])
def edit(task_id):
    task = _get_task(task_id)
    if not task:
        return redirect(url_for("home"))
    error = None
    if request.method == "POST":
        title  = request.form.get("title", "").strip()
        notes  = request.form.get("notes", "").strip()
        date_s = request.form.get("due_date", "").strip()
        time_s = request.form.get("due_time", "").strip()
        repeat = request.form.get("repeat", "none")
        if not title:
            error = "Task title cannot be empty."
        else:
            try:
                due_obj = datetime.strptime(f"{date_s} {time_s}", "%Y-%m-%d %H:%M")
                task.update(title=title, notes=notes, repeat=repeat,
                            due_date=due_obj.strftime("%Y-%m-%dT%H:%M:%S"))
                save_tasks(tasks, TASKS_FILE)
                return redirect(url_for("detail", task_id=task_id))
            except ValueError:
                error = "Invalid date or time format."
    due_obj   = datetime.strptime(task["due_date"], "%Y-%m-%dT%H:%M:%S")
    task_form = {**task,
                 "due_date_val": due_obj.strftime("%Y-%m-%d"),
                 "due_time_val": due_obj.strftime("%H:%M")}
    return render_template("add_task.html", error=error, task=task_form,
                           today=due_obj.strftime("%Y-%m-%d"))


@app.route("/detail/<task_id>")
def detail(task_id):
    task = _get_task(task_id)
    if not task:
        return redirect(url_for("home"))
    return render_template("detail.html", task=task,
                           pattern=check_missed_pattern(tasks, task_id),
                           fmt_due=_fmt_due, due_info=_due_info)


@app.route("/settings")
def settings():
    return render_template("settings.html", stats=_stats())


# ── Form-fallback routes (non-JS) ─────────────────────────────────────────────

@app.route("/complete/<task_id>", methods=["POST"])
def complete(task_id):
    complete_task(tasks, task_id)
    save_tasks(tasks, TASKS_FILE)
    return redirect(request.referrer or url_for("home"))


@app.route("/delete/<task_id>", methods=["POST"])
def delete(task_id):
    global tasks
    tasks = [t for t in tasks if t["task_id"] != task_id]
    save_tasks(tasks, TASKS_FILE)
    return redirect(url_for("home"))


@app.route("/snooze/<task_id>", methods=["POST"])
def snooze(task_id):
    minutes = int(request.form.get("minutes", 5))
    try:
        snooze_alarm(tasks, task_id, minutes)
        save_tasks(tasks, TASKS_FILE)
    except ValueError:
        pass
    return redirect(request.referrer or url_for("home"))


# ── JSON API ──────────────────────────────────────────────────────────────────

@app.route("/api/complete/<task_id>", methods=["POST"])
def api_complete(task_id):
    ok = complete_task(tasks, task_id)
    save_tasks(tasks, TASKS_FILE)
    return jsonify({"ok": ok, "stats": _stats()})


@app.route("/api/delete/<task_id>", methods=["POST"])
def api_delete(task_id):
    global tasks
    existed = any(t["task_id"] == task_id for t in tasks)
    tasks = [t for t in tasks if t["task_id"] != task_id]
    save_tasks(tasks, TASKS_FILE)
    return jsonify({"ok": existed, "stats": _stats()})


@app.route("/api/snooze/<task_id>", methods=["POST"])
def api_snooze(task_id):
    data    = request.get_json(silent=True) or {}
    minutes = int(data.get("minutes", 5))
    try:
        ok   = snooze_alarm(tasks, task_id, minutes)
        save_tasks(tasks, TASKS_FILE)
        task = _get_task(task_id)
        return jsonify({"ok": ok,
                        "due_info": _due_info(task["due_date"]) if task else {},
                        "stats": _stats()})
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)})


@app.route("/api/stats")
def api_stats():
    return jsonify(_stats())


@app.route("/api/clear-done", methods=["POST"])
def api_clear_done():
    global tasks
    tasks = [t for t in tasks if t["status"] == "pending"]
    save_tasks(tasks, TASKS_FILE)
    return jsonify({"ok": True, "stats": _stats()})


@app.route("/api/clear-all", methods=["POST"])
def api_clear_all():
    global tasks
    tasks = []
    save_tasks(tasks, TASKS_FILE)
    return jsonify({"ok": True})


@app.route("/api/due-now")
def api_due_now():
    now = datetime.now()
    due = []
    for t in tasks:
        if t["status"] != "pending" or not t.get("alarm_enabled", True):
            continue
        try:
            due_dt = datetime.strptime(t["due_date"], "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            continue
        if -60 <= (due_dt - now).total_seconds() <= 90:
            due.append({"task_id": t["task_id"], "title": t["title"]})
    return jsonify(due)


if __name__ == "__main__":
    print("\n  TaskTock  →  http://127.0.0.1:5000\n")
    app.run(debug=True, port=5000)
