#!/usr/bin/env python3
"""TaskTock — Daily Reminder & Checklist App."""

import threading
import time
import tkinter as tk
from datetime import datetime
from tkinter import font as tkfont
from tkinter import messagebox, ttk

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

# ── Palette ────────────────────────────────────────────────────────────────────
BG = "#0d1117"
SURFACE = "#161b22"
CARD = "#21262d"
ACCENT = "#58a6ff"
GREEN = "#3fb950"
RED = "#f85149"
ORANGE = "#d29922"
TEXT = "#c9d1d9"
MUTED = "#8b949e"
BORDER = "#30363d"
WHITE = "#ffffff"


class TaskTockApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("TaskTock")
        self.root.geometry("430x730")
        self.root.configure(bg=BG)
        self.root.resizable(False, False)

        self.tasks: list = load_tasks(TASKS_FILE)
        missed = recover_alarms(self.tasks)
        save_tasks(self.tasks, TASKS_FILE)

        self._alarm_fired: set = set()

        self._build_header()
        self._container = tk.Frame(self.root, bg=BG)
        self._container.pack(fill="both", expand=True)

        threading.Thread(target=self._alarm_monitor, daemon=True).start()

        self.show_home()

        if missed:
            noun = "task" if missed == 1 else "tasks"
            self.root.after(
                700,
                lambda: messagebox.showinfo(
                    "Missed Tasks",
                    f"You missed {missed} {noun} while TaskTock was closed.\n"
                    "Check your task list.",
                    parent=self.root,
                ),
            )

    # ── Header ─────────────────────────────────────────────────────────────────

    def _build_header(self) -> None:
        hdr = tk.Frame(self.root, bg=SURFACE, height=56)
        hdr.pack(fill="x")
        hdr.pack_propagate(False)

        tk.Label(
            hdr,
            text="⏰  TaskTock",
            bg=SURFACE,
            fg=WHITE,
            font=("Helvetica", 20, "bold"),
        ).pack(side="left", padx=18, pady=12)

        tk.Button(
            hdr,
            text="⚙",
            bg=SURFACE,
            fg=MUTED,
            font=("Helvetica", 18),
            bd=0,
            relief="flat",
            activebackground=SURFACE,
            cursor="hand2",
            command=self.show_settings,
        ).pack(side="right", padx=18)

    # ── Navigation ─────────────────────────────────────────────────────────────

    def _clear(self) -> None:
        for w in self._container.winfo_children():
            w.destroy()

    # ── Alarm monitor ──────────────────────────────────────────────────────────

    def _alarm_monitor(self) -> None:
        while True:
            time.sleep(30)
            now = datetime.now()
            for task in list(self.tasks):
                if task["status"] != "pending":
                    continue
                if not task.get("alarm_enabled", True):
                    continue
                if task["task_id"] in self._alarm_fired:
                    continue
                try:
                    due = datetime.strptime(task["due_date"], "%Y-%m-%dT%H:%M:%S")
                except ValueError:
                    continue
                diff = (due - now).total_seconds()
                if -60 <= diff <= 90:
                    self._alarm_fired.add(task["task_id"])
                    self.root.after(0, lambda t=task: self._show_alarm(t))

    def _show_alarm(self, task: dict) -> None:
        pop = tk.Toplevel(self.root)
        pop.title("Task Due!")
        pop.geometry("340x220")
        pop.configure(bg=SURFACE)
        pop.grab_set()
        pop.lift()
        pop.resizable(False, False)

        tk.Label(
            pop, text="⏰  Task Due!", bg=SURFACE, fg=ORANGE,
            font=("Helvetica", 16, "bold"),
        ).pack(pady=(24, 4))
        tk.Label(
            pop, text=task["title"], bg=SURFACE, fg=WHITE,
            font=("Helvetica", 13), wraplength=300,
        ).pack(pady=4)

        row = tk.Frame(pop, bg=SURFACE)
        row.pack(pady=20)

        def on_complete():
            complete_task(self.tasks, task["task_id"])
            save_tasks(self.tasks, TASKS_FILE)
            pop.destroy()
            self.show_home()

        def on_snooze():
            try:
                snooze_alarm(self.tasks, task["task_id"], 5)
                save_tasks(self.tasks, TASKS_FILE)
                self._alarm_fired.discard(task["task_id"])
            except ValueError as exc:
                messagebox.showerror("Error", str(exc), parent=pop)
            pop.destroy()

        def on_dismiss():
            self._alarm_fired.discard(task["task_id"])
            pop.destroy()

        for label, cmd, bg in [
            ("✓ Done", on_complete, GREEN),
            ("⏱ Snooze 5m", on_snooze, ORANGE),
            ("✕ Dismiss", on_dismiss, RED),
        ]:
            tk.Button(
                row, text=label, command=cmd,
                bg=bg, fg=WHITE, font=("Helvetica", 10, "bold"),
                bd=0, relief="flat", padx=12, pady=8, cursor="hand2",
            ).pack(side="left", padx=5)

    # ── Home ───────────────────────────────────────────────────────────────────

    def show_home(self) -> None:
        self._clear()
        outer = tk.Frame(self._container, bg=BG)
        outer.pack(fill="both", expand=True)

        subhdr = tk.Frame(outer, bg=BG)
        subhdr.pack(fill="x", padx=18, pady=(14, 4))
        tk.Label(
            subhdr, text="All Tasks", bg=BG, fg=WHITE,
            font=("Helvetica", 15, "bold"),
        ).pack(side="left")
        tk.Label(
            subhdr, text=datetime.now().strftime("%b %d"), bg=BG, fg=MUTED,
            font=("Helvetica", 12),
        ).pack(side="right")

        tk.Frame(outer, bg=BORDER, height=1).pack(fill="x", padx=18, pady=4)

        canvas = tk.Canvas(outer, bg=BG, highlightthickness=0)
        vsb = ttk.Scrollbar(outer, orient="vertical", command=canvas.yview)
        inner = tk.Frame(canvas, bg=BG)
        inner.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all")),
        )
        canvas.create_window((0, 0), window=inner, anchor="nw")
        canvas.configure(yscrollcommand=vsb.set)
        canvas.pack(side="left", fill="both", expand=True, padx=(18, 0), pady=4)
        vsb.pack(side="right", fill="y", pady=4)

        # mouse-wheel scroll on macOS
        canvas.bind_all(
            "<MouseWheel>",
            lambda e: canvas.yview_scroll(int(-1 * (e.delta / 120)), "units"),
        )

        pending = [t for t in self.tasks if t["status"] == "pending"]
        others = [t for t in self.tasks if t["status"] != "pending"]

        if not self.tasks:
            tk.Label(
                inner,
                text="\n\U0001f389\n\nNo tasks yet.\nTap + Add Task to get started.",
                bg=BG, fg=MUTED, font=("Helvetica", 14), justify="center",
            ).pack(pady=60)
        else:
            if pending:
                tk.Label(
                    inner, text="PENDING", bg=BG, fg=MUTED,
                    font=("Helvetica", 9, "bold"),
                ).pack(anchor="w", pady=(8, 2))
                for t in pending:
                    self._task_card(inner, t)
            if others:
                tk.Label(
                    inner, text="DONE / MISSED", bg=BG, fg=MUTED,
                    font=("Helvetica", 9, "bold"),
                ).pack(anchor="w", pady=(14, 2))
                for t in others:
                    self._task_card(inner, t)

        bar = tk.Frame(outer, bg=SURFACE, height=58)
        bar.pack(fill="x", side="bottom")
        bar.pack_propagate(False)

        tk.Button(
            bar,
            text="＋  Add Task",
            bg=ACCENT,
            fg=WHITE,
            font=("Helvetica", 13, "bold"),
            bd=0,
            relief="flat",
            padx=22,
            pady=10,
            cursor="hand2",
            command=self.show_add_task,
        ).pack(side="left", padx=14, pady=10)

    def _task_card(self, parent: tk.Frame, task: dict) -> None:
        status = task["status"]
        card = tk.Frame(parent, bg=CARD, cursor="hand2")
        card.pack(fill="x", pady=3, ipady=6)

        def open_detail(_e=None, tid=task["task_id"]):
            self.show_task_detail(tid)

        card.bind("<Button-1>", open_detail)

        icons = {"completed": ("✓", GREEN), "missed": ("✕", RED), "pending": ("○", MUTED)}
        icon, color = icons.get(status, ("○", MUTED))

        tk.Button(
            card, text=icon, bg=CARD, fg=color,
            font=("Helvetica", 15), bd=0, relief="flat", cursor="hand2",
            activebackground=CARD,
            command=lambda t=task: self._quick_complete(t),
        ).pack(side="left", padx=(10, 4), pady=4)

        info = tk.Frame(card, bg=CARD)
        info.pack(side="left", fill="x", expand=True)
        info.bind("<Button-1>", open_detail)

        title_fg = MUTED if status == "completed" else WHITE
        tf = tkfont.Font(
            family="Helvetica", size=13, weight="bold",
            overstrike=(status == "completed"),
        )
        lbl = tk.Label(info, text=task["title"], bg=CARD, fg=title_fg, font=tf, anchor="w")
        lbl.pack(fill="x")
        lbl.bind("<Button-1>", open_detail)

        due = datetime.strptime(task["due_date"], "%Y-%m-%dT%H:%M:%S")
        repeat_badge = "  \U0001f501" if task.get("repeat", "none") != "none" else ""
        sub_fg = RED if status == "missed" else MUTED
        sub = tk.Label(
            info,
            text=f"{due.strftime('%b %d · %I:%M %p')}{repeat_badge}",
            bg=CARD, fg=sub_fg, font=("Helvetica", 10), anchor="w",
        )
        sub.pack(fill="x")
        sub.bind("<Button-1>", open_detail)

    def _quick_complete(self, task: dict) -> None:
        if task["status"] == "pending":
            complete_task(self.tasks, task["task_id"])
            save_tasks(self.tasks, TASKS_FILE)
        self.show_home()

    # ── Add / Edit Task ────────────────────────────────────────────────────────

    def show_add_task(self, task_id=None) -> None:
        self._clear()
        edit = next((t for t in self.tasks if t["task_id"] == task_id), None) if task_id else None

        frame = tk.Frame(self._container, bg=BG)
        frame.pack(fill="both", expand=True, padx=22, pady=14)

        tk.Button(
            frame, text="← Back", command=self.show_home,
            bg=BG, fg=ACCENT, font=("Helvetica", 12), bd=0,
            relief="flat", cursor="hand2",
        ).pack(anchor="w")

        tk.Label(
            frame,
            text="Edit Task" if edit else "Add New Task",
            bg=BG, fg=WHITE, font=("Helvetica", 18, "bold"),
        ).pack(anchor="w", pady=(10, 18))

        def field(label: str) -> tk.Entry:
            tk.Label(frame, text=label, bg=BG, fg=MUTED, font=("Helvetica", 11)).pack(
                anchor="w", pady=(8, 2)
            )
            e = tk.Entry(
                frame, bg=CARD, fg=WHITE, insertbackground=WHITE,
                font=("Helvetica", 12), relief="flat",
                highlightbackground=BORDER, highlightthickness=1,
            )
            e.pack(fill="x", ipady=8)
            return e

        title_e = field("Task Title *")
        if edit:
            title_e.insert(0, edit["title"])

        notes_e = field("Notes (optional)")
        if edit and edit.get("notes"):
            notes_e.insert(0, edit["notes"])

        tk.Label(frame, text="Due Date & Time *", bg=BG, fg=MUTED, font=("Helvetica", 11)).pack(
            anchor="w", pady=(8, 2)
        )
        dt_row = tk.Frame(frame, bg=BG)
        dt_row.pack(fill="x")

        date_e = tk.Entry(
            dt_row, bg=CARD, fg=WHITE, insertbackground=WHITE,
            font=("Helvetica", 12), relief="flat",
            highlightbackground=BORDER, highlightthickness=1, width=13,
        )
        date_e.pack(side="left", ipady=8)

        tk.Label(dt_row, text="  @  ", bg=BG, fg=MUTED, font=("Helvetica", 12)).pack(side="left")

        time_e = tk.Entry(
            dt_row, bg=CARD, fg=WHITE, insertbackground=WHITE,
            font=("Helvetica", 12), relief="flat",
            highlightbackground=BORDER, highlightthickness=1, width=7,
        )
        time_e.pack(side="left", ipady=8)

        if edit:
            due_obj = datetime.strptime(edit["due_date"], "%Y-%m-%dT%H:%M:%S")
            date_e.insert(0, due_obj.strftime("%Y-%m-%d"))
            time_e.insert(0, due_obj.strftime("%H:%M"))
        else:
            date_e.insert(0, datetime.now().strftime("%Y-%m-%d"))
            time_e.insert(0, "09:00")

        tk.Label(
            frame, text="YYYY-MM-DD         HH:MM", bg=BG, fg=MUTED, font=("Helvetica", 9)
        ).pack(anchor="w")

        tk.Label(frame, text="Repeat", bg=BG, fg=MUTED, font=("Helvetica", 11)).pack(
            anchor="w", pady=(12, 4)
        )
        repeat_var = tk.StringVar(value=edit["repeat"] if edit else "none")
        rep_row = tk.Frame(frame, bg=BG)
        rep_row.pack(anchor="w")
        for val, lbl in [("none", "None"), ("daily", "Daily"), ("weekly", "Weekly")]:
            tk.Radiobutton(
                rep_row, text=lbl, variable=repeat_var, value=val,
                bg=BG, fg=TEXT, selectcolor=SURFACE, activebackground=BG,
                font=("Helvetica", 12),
            ).pack(side="left", padx=(0, 12))

        btn_row = tk.Frame(frame, bg=BG)
        btn_row.pack(fill="x", pady=24)

        def on_save() -> None:
            title = title_e.get().strip()
            notes = notes_e.get().strip()
            due = f"{date_e.get().strip()} {time_e.get().strip()}"

            try:
                if edit:
                    if not title:
                        raise ValueError("Task title cannot be empty. Please enter a name.")
                    due_obj = datetime.strptime(due, "%Y-%m-%d %H:%M")
                    edit["title"] = title
                    edit["notes"] = notes
                    edit["due_date"] = due_obj.strftime("%Y-%m-%dT%H:%M:%S")
                    edit["repeat"] = repeat_var.get()
                    save_tasks(self.tasks, TASKS_FILE)
                else:
                    add_task(self.tasks, title, due, repeat_var.get(), notes)
                    save_tasks(self.tasks, TASKS_FILE)
                self.show_home()
            except ValueError as exc:
                messagebox.showerror("Error", str(exc), parent=self.root)

        tk.Button(
            btn_row, text="Save Task", command=on_save,
            bg=ACCENT, fg=WHITE, font=("Helvetica", 13, "bold"),
            bd=0, relief="flat", padx=22, pady=10, cursor="hand2",
        ).pack(side="left", padx=(0, 10))

        tk.Button(
            btn_row, text="Cancel", command=self.show_home,
            bg=CARD, fg=MUTED, font=("Helvetica", 13),
            bd=0, relief="flat", padx=22, pady=10, cursor="hand2",
        ).pack(side="left")

    # ── Task Detail ────────────────────────────────────────────────────────────

    def show_task_detail(self, task_id: str) -> None:
        task = next((t for t in self.tasks if t["task_id"] == task_id), None)
        if not task:
            messagebox.showerror("Error", "Task not found. Please refresh your task list.")
            self.show_home()
            return

        self._clear()
        frame = tk.Frame(self._container, bg=BG)
        frame.pack(fill="both", expand=True, padx=22, pady=14)

        tk.Button(
            frame, text="← Back", command=self.show_home,
            bg=BG, fg=ACCENT, font=("Helvetica", 12), bd=0,
            relief="flat", cursor="hand2",
        ).pack(anchor="w")

        tk.Label(
            frame, text="Task Detail", bg=BG, fg=WHITE,
            font=("Helvetica", 18, "bold"),
        ).pack(anchor="w", pady=(10, 16))

        card = tk.Frame(frame, bg=CARD)
        card.pack(fill="x")
        tk.Frame(card, bg=BORDER, height=1).pack(fill="x")

        def detail_row(label: str, value: str, vc: str = TEXT) -> None:
            r = tk.Frame(card, bg=CARD)
            r.pack(fill="x", padx=14, pady=8)
            tk.Label(
                r, text=label, bg=CARD, fg=MUTED, font=("Helvetica", 10), width=8, anchor="w"
            ).pack(side="left")
            tk.Label(
                r, text=value, bg=CARD, fg=vc, font=("Helvetica", 12),
                anchor="w", wraplength=260,
            ).pack(side="left")
            tk.Frame(card, bg=BORDER, height=1).pack(fill="x")

        detail_row("Title", task["title"], WHITE)
        detail_row("Notes", task.get("notes") or "—")
        due = datetime.strptime(task["due_date"], "%Y-%m-%dT%H:%M:%S")
        detail_row("Due", due.strftime("%b %d, %Y · %I:%M %p"))
        detail_row("Repeat", task.get("repeat", "none").capitalize())
        status_colors = {"pending": ORANGE, "completed": GREEN, "missed": RED}
        detail_row("Status", task["status"].capitalize(), status_colors.get(task["status"], TEXT))

        pattern = check_missed_pattern(self.tasks, task_id)
        if pattern["flagged"]:
            warn = tk.Frame(frame, bg="#2d1800")
            warn.pack(fill="x", pady=10)
            tk.Label(
                warn, text=f"⚠  {pattern['message']}",
                bg="#2d1800", fg=ORANGE, font=("Helvetica", 11),
                wraplength=370, justify="left",
            ).pack(padx=14, pady=10)

        btns = tk.Frame(frame, bg=BG)
        btns.pack(fill="x", pady=16)

        if task["status"] == "pending":
            def on_complete():
                complete_task(self.tasks, task_id)
                save_tasks(self.tasks, TASKS_FILE)
                self.show_home()

            tk.Button(
                btns, text="✓  Mark Complete", command=on_complete,
                bg=GREEN, fg=WHITE, font=("Helvetica", 12, "bold"),
                bd=0, relief="flat", padx=14, pady=10, cursor="hand2",
            ).pack(fill="x", pady=3)

        tk.Button(
            btns, text="✏  Edit",
            command=lambda: self.show_add_task(task_id),
            bg=ACCENT, fg=WHITE, font=("Helvetica", 12, "bold"),
            bd=0, relief="flat", padx=14, pady=10, cursor="hand2",
        ).pack(fill="x", pady=3)

        tk.Button(
            btns, text="\U0001f5d1  Delete",
            command=lambda: self._delete(task_id),
            bg=RED, fg=WHITE, font=("Helvetica", 12, "bold"),
            bd=0, relief="flat", padx=14, pady=10, cursor="hand2",
        ).pack(fill="x", pady=3)

    def _delete(self, task_id: str) -> None:
        task = next((t for t in self.tasks if t["task_id"] == task_id), None)
        if not task:
            return
        if messagebox.askyesno(
            "Delete Task",
            f"Delete '{task['title']}'? This cannot be undone.",
            parent=self.root,
        ):
            self.tasks = [t for t in self.tasks if t["task_id"] != task_id]
            save_tasks(self.tasks, TASKS_FILE)
            self.show_home()

    # ── Settings ───────────────────────────────────────────────────────────────

    def show_settings(self) -> None:
        self._clear()
        frame = tk.Frame(self._container, bg=BG)
        frame.pack(fill="both", expand=True, padx=22, pady=14)

        tk.Button(
            frame, text="← Back", command=self.show_home,
            bg=BG, fg=ACCENT, font=("Helvetica", 12), bd=0,
            relief="flat", cursor="hand2",
        ).pack(anchor="w")

        tk.Label(
            frame, text="Settings", bg=BG, fg=WHITE, font=("Helvetica", 18, "bold"),
        ).pack(anchor="w", pady=(10, 18))

        card = tk.Frame(frame, bg=CARD)
        card.pack(fill="x")
        tk.Frame(card, bg=BORDER, height=1).pack(fill="x")

        notif_var = tk.BooleanVar(value=True)
        r1 = tk.Frame(card, bg=CARD)
        r1.pack(fill="x", padx=14, pady=12)
        tk.Label(r1, text="\U0001f514  Alarm Notifications", bg=CARD, fg=WHITE,
                 font=("Helvetica", 13)).pack(side="left")
        tk.Checkbutton(
            r1, variable=notif_var, bg=CARD, activebackground=CARD,
            selectcolor=SURFACE, cursor="hand2",
        ).pack(side="right")
        tk.Frame(card, bg=BORDER, height=1).pack(fill="x")

        r2 = tk.Frame(card, bg=CARD)
        r2.pack(fill="x", padx=14, pady=12)
        tk.Label(r2, text="ℹ️  TaskTock", bg=CARD, fg=WHITE,
                 font=("Helvetica", 13)).pack(side="left")
        tk.Label(r2, text="v1.0.0 MVP", bg=CARD, fg=MUTED, font=("Helvetica", 11)).pack(side="right")
        tk.Frame(card, bg=BORDER, height=1).pack(fill="x")

        tk.Button(
            frame, text="Save Settings",
            command=lambda: messagebox.showinfo(
                "Settings", "Settings saved!", parent=self.root
            ),
            bg=ACCENT, fg=WHITE, font=("Helvetica", 13, "bold"),
            bd=0, relief="flat", padx=20, pady=10, cursor="hand2",
        ).pack(anchor="w", pady=20)


# ── Entry point ────────────────────────────────────────────────────────────────

def main() -> None:
    root = tk.Tk()
    TaskTockApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
