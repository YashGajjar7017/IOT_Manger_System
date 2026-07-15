"""
Modbus PCB Dashboard
---------------------
A PCB-themed GUI for polling Modbus registers and comparing snapshots.
Integrates modbus_poll_3.py and compare_registers.py logic directly.
"""

import json
import os
import re
import sys
import time
import glob
import threading
from datetime import datetime
import tkinter as tk
from tkinter import ttk, messagebox, filedialog

# ─────────────────────────────────────────────
#  Try importing pymodbus — warn if missing
# ─────────────────────────────────────────────
try:
    from pymodbus.client import ModbusTcpClient
    PYMODBUS_OK = True
except ImportError:
    PYMODBUS_OK = False

# ─────────────────────────────────────────────
#  PCB Colour Palette
# ─────────────────────────────────────────────
PCB_BG        = "#0d1f0d"
PCB_BOARD     = "#133213"
PCB_TRACK     = "#1a4d1a"
PCB_TRACK_LT  = "#206620"
PCB_COPPER    = "#c87533"
PCB_COPPER_LT = "#e89a55"
PCB_IC_BODY   = "#1c1c1c"
PCB_IC_PIN    = "#aaaaaa"
PCB_LED_OFF   = "#1a2e1a"
PCB_LED_RED   = "#ff3030"
PCB_LED_GRN   = "#00ff55"
PCB_LED_YLW   = "#ffcc00"
PCB_LED_BLU   = "#00aaff"
PCB_TEXT      = "#b8ffb8"
PCB_TEXT_DIM  = "#4a7a4a"
PCB_WHITE     = "#e8ffe8"
PCB_SILK      = "#d4e8d4"
PCB_ERR       = "#ff4444"
PCB_WARN      = "#ffaa00"
PCB_OK        = "#00ff80"
PCB_GOLD      = "#ffd700"

# Output directory — one level up from this script (Test folder)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))

RETRIES = 3
DELAY_BETWEEN_REQUESTS = 0.05


# ─────────────────────────────────────────────
#  Modbus poll logic
# ─────────────────────────────────────────────
def _read_block(client, reg_type, address, count, slave_id):
    method = (client.read_holding_registers
              if reg_type == "holding"
              else client.read_input_registers)
    for kwarg_name in ("slave", "unit", "device_id"):
        try:
            return method(address=address, count=count, **{kwarg_name: slave_id})
        except TypeError:
            continue
    return method(address=address, count=count)


def read_registers(client, start, end, reg_type, slave_id, chunk_size,
                   progress_cb=None, log_cb=None):
    values = []
    address = start
    total = end - start + 1

    if reg_type not in ("holding", "input"):
        raise ValueError("REGISTER_TYPE must be 'holding' or 'input'")

    while address <= end:
        count = min(chunk_size, end - address + 1)
        result = None
        last_error = None

        for attempt in range(RETRIES):
            try:
                result = _read_block(client, reg_type, address, count, slave_id)
                if not result.isError():
                    break
                last_error = result
            except Exception as exc:
                last_error = exc
                try:
                    client.close()
                except Exception:
                    pass
                client.connect()
            time.sleep(DELAY_BETWEEN_REQUESTS)

        if result is None or result.isError():
            msg = f"Failed {address}-{address+count-1}: {last_error}"
            if log_cb:
                log_cb(msg, "warn")
            values.extend([None] * count)
        else:
            values.extend(result.registers)

        address += count
        done = min(address - start, total)
        pct = done / total
        if progress_cb:
            progress_cb(pct, done, total)
        time.sleep(DELAY_BETWEEN_REQUESTS)

    return values


def registers_to_long(values, start):
    values_dict = {}
    for i in range(0, len(values), 2):
        reg_num = start + i
        val1 = values[i]
        val2 = values[i + 1] if i + 1 < len(values) else None
        if val1 is not None and val2 is not None:
            values_dict[str(reg_num)] = (val1 << 16) | val2
        else:
            values_dict[str(reg_num)] = None
    return values_dict


# ─────────────────────────────────────────────
#  Compare logic
# ─────────────────────────────────────────────
def load_registers(filepath):
    with open(filepath, "r") as f:
        return json.load(f)


def compare_two(data1, data2):
    values1, values2 = data1["values"], data2["values"]
    differences = []

    if isinstance(values1, dict) and isinstance(values2, dict):
        all_keys = set(values1.keys()) | set(values2.keys())
        try:
            sorted_keys = sorted(all_keys, key=int)
        except ValueError:
            sorted_keys = sorted(all_keys)
        for k in sorted_keys:
            v1, v2 = values1.get(k), values2.get(k)
            if v1 != v2:
                differences.append((k, v1, v2))
    elif isinstance(values1, list) and isinstance(values2, list):
        length = min(len(values1), len(values2))
        start1 = data1["start_register"]
        for i in range(length):
            if values1[i] != values2[i]:
                differences.append((str(start1 + i), values1[i], values2[i]))
    return differences


def compare_all_files(filepaths):
    """Compare every consecutive pair of files and union all changed registers."""
    if len(filepaths) < 2:
        return [], []

    labels = [os.path.basename(fp) for fp in filepaths]
    datasets = [load_registers(fp) for fp in filepaths]

    # collect all registers that changed in ANY pair
    changed_regs = set()
    for i in range(len(datasets) - 1):
        diffs = compare_two(datasets[i], datasets[i + 1])
        for reg, _, _ in diffs:
            changed_regs.add(reg)

    try:
        sorted_regs = sorted(changed_regs, key=int)
    except ValueError:
        sorted_regs = sorted(changed_regs)

    rows = []
    for reg in sorted_regs:
        row = [reg]
        for ds in datasets:
            val = ds["values"].get(reg, "—") if isinstance(ds["values"], dict) else "?"
            row.append(str(val) if val is not None else "None")
        rows.append(row)

    return labels, rows


# ─────────────────────────────────────────────
#  LED Widget
# ─────────────────────────────────────────────
class LED(tk.Canvas):
    def __init__(self, parent, color=PCB_LED_GRN, size=14, **kwargs):
        super().__init__(parent, width=size + 6, height=size + 6,
                         bg=PCB_BOARD, highlightthickness=0, **kwargs)
        self.size = size
        self.color = color
        self._on = False
        self._blink_job = None
        self._draw()

    def _draw(self):
        s = self.size
        p = 3
        self.delete("all")
        if self._on:
            self.create_oval(0, 0, s + 6, s + 6,
                             fill="", outline=self.color, width=1)
            self.create_oval(p, p, s + p, s + p,
                             fill=self.color, outline=PCB_COPPER_LT, width=1)
            self.create_oval(p + 2, p + 2, p + s // 3, p + s // 3,
                             fill="white", outline="")
        else:
            self.create_oval(p, p, s + p, s + p,
                             fill=PCB_LED_OFF, outline=PCB_COPPER, width=1)

    def turn_on(self):
        self._on = True
        self._draw()

    def turn_off(self):
        self._on = False
        self._draw()

    def set_color(self, color):
        self.color = color
        self._draw()

    def blink(self, interval=400):
        if self._blink_job:
            self.after_cancel(self._blink_job)
        self._on = not self._on
        self._draw()
        self._blink_job = self.after(interval, lambda: self.blink(interval))

    def stop_blink(self, final_state=True):
        if self._blink_job:
            self.after_cancel(self._blink_job)
            self._blink_job = None
        self._on = final_state
        self._draw()


# ─────────────────────────────────────────────
#  IC Button
# ─────────────────────────────────────────────
class ICButton(tk.Canvas):
    def __init__(self, parent, text="IC", subtext="", command=None,
                 width=220, height=78, pin_count=8, **kwargs):
        super().__init__(parent, width=width, height=height,
                         bg=PCB_BOARD, highlightthickness=0, **kwargs)
        self.text = text
        self.subtext = subtext
        self.command = command
        self.w = width
        self.h = height
        self.pin_count = pin_count
        self._pressed = False
        self._hover = False
        self._draw()
        self.bind("<ButtonPress-1>", self._on_press)
        self.bind("<ButtonRelease-1>", self._on_release)
        self.bind("<Enter>", self._on_enter)
        self.bind("<Leave>", self._on_leave)

    def _draw(self):
        self.delete("all")
        w, h = self.w, self.h
        body_pad = 18
        bx1, by1 = body_pad, 5
        bx2, by2 = w - body_pad, h - 5

        pins_per_side = self.pin_count // 2
        pin_spacing = (by2 - by1) / (pins_per_side + 1)

        # Left pins
        for i in range(pins_per_side):
            py = by1 + pin_spacing * (i + 1)
            self.create_rectangle(0, py - 3, body_pad - 1, py + 3,
                                  fill=PCB_IC_PIN, outline="")
            self.create_rectangle(body_pad - 3, py - 5, body_pad + 3, py + 5,
                                  fill=PCB_COPPER, outline=PCB_COPPER_LT, width=1)

        # Right pins
        for i in range(pins_per_side):
            py = by1 + pin_spacing * (i + 1)
            self.create_rectangle(w - body_pad + 1, py - 3, w, py + 3,
                                  fill=PCB_IC_PIN, outline="")
            self.create_rectangle(w - body_pad - 3, py - 5, w - body_pad + 3, py + 5,
                                  fill=PCB_COPPER, outline=PCB_COPPER_LT, width=1)

        # Shadow
        offset = 0 if self._pressed else 3
        self.create_rectangle(bx1 + 2, by1 + offset + 1, bx2 + 2, by2 + offset + 1,
                               fill="#050a05", outline="")

        # Body
        if self._pressed:
            body_c = "#111"
            bx1 += 1; by1 += offset
        elif self._hover:
            body_c = "#2a3a22"
        else:
            body_c = "#1e2e1e"

        self.create_rectangle(bx1, by1, bx2, by2,
                               fill=body_c, outline=PCB_COPPER, width=2)

        # Notch
        cx = (bx1 + bx2) // 2
        self.create_arc(cx - 9, by1 - 6, cx + 9, by1 + 6,
                        start=0, extent=180,
                        fill=body_c, outline=PCB_COPPER, width=1)

        # Pin-1 dot
        self.create_oval(bx1 + 7, by2 - 11, bx1 + 12, by2 - 6,
                         fill=PCB_COPPER_LT, outline="")

        # Main label
        ty = (by1 + by2) // 2 - (9 if self.subtext else 0)
        txt_color = PCB_OK if self._pressed else PCB_LED_GRN
        self.create_text(w // 2, ty, text=self.text,
                         fill=txt_color, font=("Consolas", 11, "bold"))

        # Sub label
        if self.subtext:
            self.create_text(w // 2, ty + 17, text=self.subtext,
                             fill=PCB_TEXT_DIM, font=("Consolas", 8))

    def _on_press(self, e):
        self._pressed = True
        self._draw()

    def _on_release(self, e):
        self._pressed = False
        self._draw()
        if self.command:
            self.command()

    def _on_enter(self, e):
        self._hover = True
        self._draw()

    def _on_leave(self, e):
        self._hover = False
        self._draw()

    def set_text(self, text, subtext=""):
        self.text = text
        self.subtext = subtext
        self._draw()


# ─────────────────────────────────────────────
#  Resistor widget (decoration)
# ─────────────────────────────────────────────
class ResistorWidget(tk.Canvas):
    def __init__(self, parent, label="10kΩ", **kwargs):
        super().__init__(parent, width=92, height=30,
                         bg=PCB_BOARD, highlightthickness=0, **kwargs)
        self.create_line(0, 14, 16, 14, fill=PCB_IC_PIN, width=2)
        self.create_line(76, 14, 92, 14, fill=PCB_IC_PIN, width=2)
        self.create_rectangle(16, 7, 76, 21,
                               fill="#6B3A1F", outline=PCB_COPPER_LT, width=1)
        colors = ["#ff3030", "#ff9900", "#4488ff", "#bbbbbb"]
        for i, c in enumerate(colors):
            bx = 23 + i * 12
            self.create_rectangle(bx, 7, bx + 6, 21, fill=c, outline="")
        self.create_text(46, 28, text=label, fill=PCB_TEXT_DIM,
                         font=("Consolas", 7), anchor="s")


# ─────────────────────────────────────────────
#  Progress Bar (segmented LED style)
# ─────────────────────────────────────────────
class PCBProgressBar(tk.Canvas):
    def __init__(self, parent, width=400, height=18, **kwargs):
        super().__init__(parent, width=width, height=height,
                         bg=PCB_BOARD, highlightthickness=0, **kwargs)
        self.w = width
        self.h = height
        self._pct = 0.0
        self._draw()

    def set(self, pct):
        self._pct = max(0.0, min(1.0, pct))
        self._draw()

    def _draw(self):
        self.delete("all")
        w, h = self.w, self.h
        self.create_rectangle(0, 0, w, h, fill="#0a180a", outline=PCB_TRACK, width=1)
        fw = int((w - 2) * self._pct)
        seg = 9
        for x in range(1, fw, seg + 2):
            seg_w = min(seg, fw - x)
            c = PCB_LED_GRN if self._pct < 0.85 else PCB_LED_YLW
            self.create_rectangle(x, 2, x + seg_w, h - 2, fill=c, outline="")
        self.create_text(w // 2, h // 2, text=f"{int(self._pct * 100)}%",
                         fill=PCB_WHITE, font=("Consolas", 8, "bold"))


# ─────────────────────────────────────────────
#  Scrollable Table
# ─────────────────────────────────────────────
class PCBTable(tk.Frame):
    def __init__(self, parent, columns, **kwargs):
        super().__init__(parent, bg=PCB_BG, **kwargs)
        self.columns = list(columns)
        self._setup_style()

        vsb = ttk.Scrollbar(self, orient="vertical")
        hsb = ttk.Scrollbar(self, orient="horizontal")

        self.tree = ttk.Treeview(self, columns=self.columns, show="headings",
                                  style="PCB.Treeview",
                                  yscrollcommand=vsb.set,
                                  xscrollcommand=hsb.set)
        vsb.config(command=self.tree.yview)
        hsb.config(command=self.tree.xview)

        self._apply_columns()

        self.tree.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")
        hsb.grid(row=1, column=0, sticky="ew")
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

    def _setup_style(self):
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("PCB.Treeview",
                        background=PCB_BOARD, foreground=PCB_TEXT,
                        fieldbackground=PCB_BOARD, rowheight=22,
                        font=("Consolas", 9))
        style.configure("PCB.Treeview.Heading",
                        background=PCB_IC_BODY, foreground=PCB_COPPER_LT,
                        font=("Consolas", 9, "bold"), relief="flat")
        style.map("PCB.Treeview",
                  background=[("selected", PCB_TRACK_LT)],
                  foreground=[("selected", PCB_WHITE)])

    def _apply_columns(self):
        self.tree["columns"] = self.columns
        self.tree["show"] = "headings"
        for col in self.columns:
            self.tree.heading(col, text=col)
            w = 100 if col != "Register" else 90
            self.tree.column(col, width=w, minwidth=70, anchor="center")

    def clear(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

    def add_row(self, values, tag=""):
        self.tree.insert("", "end", values=values, tags=(tag,))
        self.tree.tag_configure("diff",
                                background="#152515",
                                foreground=PCB_LED_YLW)

    def reconfigure_columns(self, columns):
        self.columns = list(columns)
        self._apply_columns()


# ─────────────────────────────────────────────
#  Log Console
# ─────────────────────────────────────────────
class LogConsole(tk.Text):
    def __init__(self, parent, **kwargs):
        super().__init__(parent,
                         bg="#080f08", fg=PCB_TEXT,
                         font=("Consolas", 9),
                         insertbackground=PCB_TEXT,
                         selectbackground=PCB_TRACK,
                         relief="flat", bd=0,
                         state="disabled", **kwargs)
        self.tag_configure("info",    foreground=PCB_TEXT)
        self.tag_configure("ok",      foreground=PCB_OK)
        self.tag_configure("warn",    foreground=PCB_WARN)
        self.tag_configure("error",   foreground=PCB_ERR)
        self.tag_configure("heading", foreground=PCB_COPPER_LT,
                           font=("Consolas", 9, "bold"))
        self.tag_configure("dim",     foreground=PCB_TEXT_DIM)

    def log(self, msg, level="info"):
        self.config(state="normal")
        ts = datetime.now().strftime("%H:%M:%S")
        self.insert("end", f"[{ts}] {msg}\n", level)
        self.see("end")
        self.config(state="disabled")

    def clear(self):
        self.config(state="normal")
        self.delete("1.0", "end")
        self.config(state="disabled")


# ─────────────────────────────────────────────
#  Main Application
# ─────────────────────────────────────────────
class ModbusApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Modbus PCB Dashboard  v1.0")
        self.configure(bg=PCB_BG)
        self.resizable(True, True)
        self.minsize(920, 660)

        self._poll_running = False
        self._next_file_index = self._detect_next_index()
        self._stored_labels = []
        self._stored_rows = []

        self._build_header()
        self._build_main_area()
        self._build_footer()
        self._refresh_file_list()

        self.log("PCB Dashboard ready.", "ok")
        self.log(f"Output dir: {OUTPUT_DIR}", "dim")
        if not PYMODBUS_OK:
            self.log("WARNING: pymodbus not installed.  Run: pip install pymodbus", "warn")

    # ── helpers ──────────────────────────────
    def _detect_next_index(self):
        files = glob.glob(os.path.join(OUTPUT_DIR, "registers_*.json"))
        nums = []
        for fp in files:
            m = re.search(r"registers_(\d+)\.json$", fp)
            if m:
                nums.append(int(m.group(1)))
        return max(nums) + 1 if nums else 1

    def _get_register_files(self):
        files = glob.glob(os.path.join(OUTPUT_DIR, "registers_*.json"))
        def sort_key(fp):
            m = re.search(r"registers_(\d+)\.json$", fp)
            return int(m.group(1)) if m else 0
        return sorted(files, key=sort_key)

    def _ui(self, fn, *args, **kwargs):
        self.after(0, lambda: fn(*args, **kwargs))

    def log(self, msg, level="info"):
        self.console.log(msg, level)
        self.footer_var.set(msg[:120])

    # ── Header ───────────────────────────────
    def _build_header(self):
        hf = tk.Frame(self, bg=PCB_BOARD, height=72)
        hf.pack(fill="x", pady=(0, 2))
        hf.pack_propagate(False)

        # Mini-IC logo
        lc = tk.Canvas(hf, width=68, height=72, bg=PCB_BOARD, highlightthickness=0)
        lc.pack(side="left", padx=8)
        self._draw_logo(lc)

        tf = tk.Frame(hf, bg=PCB_BOARD)
        tf.pack(side="left", fill="y", padx=4)
        tk.Label(tf, text="MODBUS  PCB  DASHBOARD",
                 bg=PCB_BOARD, fg=PCB_LED_GRN,
                 font=("Consolas", 17, "bold")).pack(anchor="w", pady=(10, 0))
        tk.Label(tf, text="Register Poller & Comparator  ·  Modbus TCP",
                 bg=PCB_BOARD, fg=PCB_TEXT_DIM,
                 font=("Consolas", 8)).pack(anchor="w")

        # Header LEDs
        lf = tk.Frame(hf, bg=PCB_BOARD)
        lf.pack(side="right", padx=18, pady=10)
        for col, (attr, lbl, color) in enumerate([
            ("led_conn", "CONN", PCB_LED_GRN),
            ("led_poll", "POLL", PCB_LED_YLW),
            ("led_cmp",  "CMP",  PCB_LED_BLU),
            ("led_err",  "ERR",  PCB_LED_RED),
        ]):
            led = LED(lf, color=color)
            led.grid(row=0, column=col, padx=6)
            tk.Label(lf, text=lbl, bg=PCB_BOARD, fg=PCB_TEXT_DIM,
                     font=("Consolas", 7)).grid(row=1, column=col)
            setattr(self, attr, led)

    def _draw_logo(self, c):
        c.create_rectangle(20, 10, 48, 62, fill=PCB_IC_BODY, outline=PCB_COPPER, width=2)
        for i in range(3):
            y = 18 + i * 13
            c.create_rectangle(8, y, 20, y + 7, fill=PCB_IC_PIN, outline="")
            c.create_rectangle(48, y, 60, y + 7, fill=PCB_IC_PIN, outline="")
        c.create_arc(26, 7, 42, 17, start=0, extent=180,
                     fill=PCB_IC_BODY, outline=PCB_COPPER)
        c.create_text(34, 36, text="MB", fill=PCB_LED_GRN, font=("Consolas", 12, "bold"))

    # ── Main area ────────────────────────────
    def _build_main_area(self):
        pw = tk.PanedWindow(self, orient="horizontal",
                            bg=PCB_BG, sashrelief="flat",
                            sashwidth=5, sashpad=1)
        pw.pack(fill="both", expand=True, padx=4, pady=4)

        left = tk.Frame(pw, bg=PCB_BOARD, width=270)
        pw.add(left, minsize=250)
        self._build_left(left)

        right = tk.Frame(pw, bg=PCB_BG)
        pw.add(right, minsize=420)
        self._build_right(right)

    # ── Left panel ───────────────────────────
    def _build_left(self, parent):
        self._build_config(parent)
        self._build_ic_buttons(parent)
        self._build_file_panel(parent)
        self._build_deco(parent)

    def _build_config(self, parent):
        lf = tk.LabelFrame(parent, text="[ DEVICE CONFIG ]",
                           bg=PCB_BOARD, fg=PCB_COPPER_LT,
                           font=("Consolas", 8, "bold"),
                           labelanchor="n", bd=2, relief="groove")
        lf.pack(fill="x", padx=8, pady=(8, 4))

        fields = [
            ("IP Address",     "192.168.4.1"),
            ("Port",           "502"),
            ("Slave ID",       "1"),
            ("Start Register", "2000"),
            ("End Register",   "6000"),
            ("Chunk Size",     "100"),
            ("Timeout (s)",    "5"),
        ]
        self._cfg = {}
        for i, (lbl, dflt) in enumerate(fields):
            tk.Label(lf, text=lbl + ":", bg=PCB_BOARD, fg=PCB_TEXT_DIM,
                     font=("Consolas", 8), anchor="w").grid(
                row=i, column=0, padx=6, pady=1, sticky="w")
            var = tk.StringVar(value=dflt)
            tk.Entry(lf, textvariable=var, width=13,
                     bg="#080f08", fg=PCB_LED_GRN,
                     insertbackground=PCB_LED_GRN,
                     font=("Consolas", 9), relief="flat", bd=0,
                     highlightthickness=1,
                     highlightbackground=PCB_TRACK,
                     highlightcolor=PCB_COPPER).grid(
                row=i, column=1, padx=6, pady=1, sticky="ew")
            self._cfg[lbl] = var

        n = len(fields)
        tk.Label(lf, text="Reg Type:", bg=PCB_BOARD, fg=PCB_TEXT_DIM,
                 font=("Consolas", 8)).grid(row=n, column=0, padx=6, pady=2, sticky="w")
        self._reg_type = tk.StringVar(value="holding")
        rb = tk.Frame(lf, bg=PCB_BOARD)
        rb.grid(row=n, column=1, sticky="w")
        for rt in ("holding", "input"):
            tk.Radiobutton(rb, text=rt, variable=self._reg_type, value=rt,
                           bg=PCB_BOARD, fg=PCB_TEXT,
                           selectcolor=PCB_IC_BODY,
                           activebackground=PCB_BOARD,
                           font=("Consolas", 8)).pack(side="left")
        lf.columnconfigure(1, weight=1)

    def _build_ic_buttons(self, parent):
        bf = tk.Frame(parent, bg=PCB_BOARD)
        bf.pack(fill="x", padx=8, pady=4)

        tk.Label(bf, text="──── IC CONTROL CHIPS ────",
                 bg=PCB_BOARD, fg=PCB_TEXT_DIM, font=("Consolas", 7)).pack(pady=(0, 4))

        self.poll_btn = ICButton(
            bf, text="▶  POLL REGISTERS",
            subtext=f"→ registers_{self._next_file_index}.json",
            command=self._on_poll, width=246, height=80, pin_count=8)
        self.poll_btn.pack(pady=4)

        self.cmp_btn = ICButton(
            bf, text="⟳  COMPARE ALL",
            subtext="All captured snapshots",
            command=self._on_compare, width=246, height=80, pin_count=8)
        self.cmp_btn.pack(pady=4)

        # Progress
        pf = tk.Frame(bf, bg=PCB_BOARD)
        pf.pack(fill="x", pady=2)
        tk.Label(pf, text="POLL PROGRESS", bg=PCB_BOARD, fg=PCB_TEXT_DIM,
                 font=("Consolas", 7)).pack(anchor="w")
        self.progress = PCBProgressBar(pf, width=246, height=18)
        self.progress.pack()

        self.status_var = tk.StringVar(value="IDLE")
        self.status_lbl = tk.Label(bf, textvariable=self.status_var,
                                   bg=PCB_BOARD, fg=PCB_LED_GRN,
                                   font=("Consolas", 9, "bold"))
        self.status_lbl.pack(pady=2)

    def _build_file_panel(self, parent):
        ff = tk.LabelFrame(parent, text="[ CAPTURED SNAPSHOTS ]",
                           bg=PCB_BOARD, fg=PCB_COPPER_LT,
                           font=("Consolas", 8, "bold"),
                           labelanchor="n", bd=2, relief="groove")
        ff.pack(fill="both", expand=True, padx=8, pady=4)

        self.file_lb = tk.Listbox(ff,
                                   bg="#080f08", fg=PCB_TEXT,
                                   selectbackground=PCB_TRACK_LT,
                                   selectforeground=PCB_WHITE,
                                   font=("Consolas", 8),
                                   relief="flat", bd=0,
                                   activestyle="none", height=5)
        self.file_lb.pack(fill="both", expand=True, padx=4, pady=4)

        br = tk.Frame(ff, bg=PCB_BOARD)
        br.pack(fill="x", padx=4, pady=(0, 4))
        for txt, cmd, color in [
            ("⟳ Refresh", self._refresh_file_list, PCB_TEXT),
            ("🗂 Open Dir", self._open_dir, PCB_TEXT),
            ("✕ Delete", self._delete_file, PCB_ERR),
        ]:
            tk.Button(br, text=txt, command=cmd,
                      bg=PCB_IC_BODY, fg=color, font=("Consolas", 7),
                      relief="flat", bd=0, padx=4,
                      activebackground=PCB_TRACK,
                      activeforeground=PCB_WHITE).pack(side="left", padx=2)

    def _build_deco(self, parent):
        df = tk.Frame(parent, bg=PCB_BOARD)
        df.pack(fill="x", padx=8, pady=(2, 6))
        tk.Label(df, text="──── PASSIVES ────",
                 bg=PCB_BOARD, fg=PCB_TEXT_DIM, font=("Consolas", 7)).pack(pady=(2, 2))
        rr = tk.Frame(df, bg=PCB_BOARD)
        rr.pack()
        ResistorWidget(rr, label="10 kΩ").pack(side="left", padx=4, pady=2)
        ResistorWidget(rr, label="4.7 kΩ").pack(side="left", padx=4, pady=2)

    # ── Right panel ──────────────────────────
    def _build_right(self, parent):
        nb = ttk.Notebook(parent)
        nb.pack(fill="both", expand=True, padx=2, pady=2)

        style = ttk.Style()
        style.configure("TNotebook", background=PCB_BG, borderwidth=0)
        style.configure("TNotebook.Tab",
                        background=PCB_IC_BODY, foreground=PCB_TEXT_DIM,
                        font=("Consolas", 9), padding=[10, 4])
        style.map("TNotebook.Tab",
                  background=[("selected", PCB_BOARD)],
                  foreground=[("selected", PCB_COPPER_LT)])

        # Tab 1: Log
        log_tab = tk.Frame(nb, bg=PCB_BG)
        nb.add(log_tab, text="  📟  LOG CONSOLE  ")
        self._build_log_tab(log_tab)

        # Tab 2: Compare results
        cmp_tab = tk.Frame(nb, bg=PCB_BG)
        nb.add(cmp_tab, text="  📊  COMPARE RESULTS  ")
        self._build_cmp_tab(cmp_tab)

        self._nb = nb

    def _build_log_tab(self, tab):
        hdr = tk.Frame(tab, bg=PCB_BG)
        hdr.pack(fill="x", padx=6, pady=(4, 0))
        tk.Label(hdr, text="SERIAL MONITOR  ·  9600 BAUD",
                 bg=PCB_BG, fg=PCB_COPPER_LT, font=("Consolas", 9, "bold")).pack(side="left")
        tk.Button(hdr, text="CLR", command=lambda: self.console.clear(),
                  bg=PCB_IC_BODY, fg=PCB_TEXT_DIM, font=("Consolas", 7),
                  relief="flat").pack(side="right", padx=4)

        frame = tk.Frame(tab, bg=PCB_BG, relief="flat", bd=1,
                         highlightthickness=1, highlightbackground=PCB_TRACK)
        frame.pack(fill="both", expand=True, padx=6, pady=4)
        self.console = LogConsole(frame, wrap="word")
        vsb = ttk.Scrollbar(frame, command=self.console.yview)
        self.console.config(yscrollcommand=vsb.set)
        vsb.pack(side="right", fill="y")
        self.console.pack(fill="both", expand=True)

    def _build_cmp_tab(self, tab):
        hdr = tk.Frame(tab, bg=PCB_BG)
        hdr.pack(fill="x", padx=6, pady=(4, 0))
        self.cmp_title = tk.Label(hdr, text="Press COMPARE to populate this table.",
                                   bg=PCB_BG, fg=PCB_TEXT_DIM,
                                   font=("Consolas", 9))
        self.cmp_title.pack(side="left")

        self.export_btn = tk.Button(hdr, text="⬇ Export CSV",
                                     command=self._export_csv,
                                     bg=PCB_IC_BODY, fg=PCB_TEXT, font=("Consolas", 8),
                                     relief="flat", state="disabled")
        self.export_btn.pack(side="right", padx=4)

        self.result_table = PCBTable(tab, columns=["Register", "File 1", "File 2"])
        self.result_table.pack(fill="both", expand=True, padx=6, pady=4)

    # ── Footer ───────────────────────────────
    def _build_footer(self):
        ff = tk.Frame(self, bg=PCB_BOARD, height=26)
        ff.pack(fill="x", side="bottom")
        ff.pack_propagate(False)
        self.footer_var = tk.StringVar(value="Ready.")
        tk.Label(ff, textvariable=self.footer_var,
                 bg=PCB_BOARD, fg=PCB_TEXT_DIM, font=("Consolas", 8)).pack(
            side="left", padx=10, pady=4)
        tk.Label(ff, text="Modbus PCB Dashboard  ·  pymodbus",
                 bg=PCB_BOARD, fg=PCB_TEXT_DIM, font=("Consolas", 8)).pack(
            side="right", padx=10)

    # ── Config helper ────────────────────────
    def _get_config(self):
        try:
            return {
                "ip":         self._cfg["IP Address"].get().strip(),
                "port":       int(self._cfg["Port"].get()),
                "slave_id":   int(self._cfg["Slave ID"].get()),
                "start":      int(self._cfg["Start Register"].get()),
                "end":        int(self._cfg["End Register"].get()),
                "chunk_size": int(self._cfg["Chunk Size"].get()),
                "timeout":    int(self._cfg["Timeout (s)"].get()),
                "reg_type":   self._reg_type.get(),
            }
        except ValueError as e:
            messagebox.showerror("Config Error", f"Invalid config:\n{e}")
            return None

    # ── Poll ─────────────────────────────────
    def _on_poll(self):
        if self._poll_running:
            self.log("Poll already running!", "warn")
            return
        if not PYMODBUS_OK:
            messagebox.showerror("Missing Library",
                                  "pymodbus is not installed.\n\nRun:\n  pip install pymodbus")
            return
        cfg = self._get_config()
        if cfg is None:
            return

        self._poll_running = True
        self.led_err.turn_off()
        self.led_conn.turn_off()
        self.led_poll.blink(350)
        self.status_var.set("POLLING…")
        self.status_lbl.config(fg=PCB_LED_YLW)
        self.progress.set(0)

        threading.Thread(target=self._poll_worker, args=(cfg,), daemon=True).start()

    def _poll_worker(self, cfg):
        idx = self._next_file_index
        out_file = os.path.join(OUTPUT_DIR, f"registers_{idx}.json")
        self._ui(self.log, f"Connecting → {cfg['ip']}:{cfg['port']}…", "info")

        try:
            client = ModbusTcpClient(cfg["ip"], port=cfg["port"], timeout=cfg["timeout"])
            if not client.connect():
                self._ui(self.log, f"Connection FAILED: {cfg['ip']}:{cfg['port']}", "error")
                self._ui(self.led_err.turn_on)
                self._ui(self._finish_poll, False)
                return

            self._ui(self.led_conn.turn_on)
            self._ui(self.log,
                     f"Connected. Reading {cfg['reg_type']} registers "
                     f"{cfg['start']}–{cfg['end']}…", "ok")

            values = read_registers(
                client, cfg["start"], cfg["end"],
                cfg["reg_type"], cfg["slave_id"], cfg["chunk_size"],
                progress_cb=lambda pct, done, total: self._ui(
                    self._update_progress, pct, done, total),
                log_cb=lambda msg, lvl: self._ui(self.log, msg, lvl),
            )
            client.close()

            values_dict = registers_to_long(values, cfg["start"])

            data = {
                "ip": cfg["ip"],
                "start_register": cfg["start"],
                "end_register": cfg["end"],
                "register_type": cfg["reg_type"],
                "timestamp": datetime.now().isoformat(),
                "values": values_dict,
            }
            with open(out_file, "w") as f:
                json.dump(data, f, indent=2)

            self._ui(self.log,
                     f"✔ Saved {len(values_dict)} registers → registers_{idx}.json", "ok")
            self._next_file_index += 1
            self._ui(self._refresh_file_list)
            self._ui(self._update_poll_label)
            self._ui(self._finish_poll, True)

        except Exception as exc:
            self._ui(self.log, f"Error: {exc}", "error")
            self._ui(self.led_err.turn_on)
            self._ui(self._finish_poll, False)

    def _finish_poll(self, success):
        self._poll_running = False
        self.led_poll.stop_blink(success)
        self.progress.set(1.0 if success else 0.0)
        if success:
            self.status_var.set("DONE ✔")
            self.status_lbl.config(fg=PCB_OK)
        else:
            self.status_var.set("ERROR ✘")
            self.status_lbl.config(fg=PCB_ERR)

    def _update_progress(self, pct, done, total):
        self.progress.set(pct)
        self.status_var.set(f"READ  {done} / {total}")

    def _update_poll_label(self):
        self.poll_btn.set_text("▶  POLL REGISTERS",
                                f"→ registers_{self._next_file_index}.json")

    # ── Compare ──────────────────────────────
    def _on_compare(self):
        files = self._get_register_files()
        if len(files) < 2:
            messagebox.showwarning("Not Enough Files",
                                    "At least 2 captured snapshots are needed to compare.\n"
                                    "Run POLL at least twice first.")
            return

        self.led_cmp.blink(300)
        self.status_var.set("COMPARING…")
        self.status_lbl.config(fg=PCB_LED_BLU)
        self.log(f"Comparing {len(files)} snapshot(s)…", "info")

        def _worker():
            try:
                labels, rows = compare_all_files(files)
                self._ui(self._show_compare, labels, rows, len(files))
            except Exception as exc:
                self._ui(self.log, f"Compare error: {exc}", "error")
                self._ui(self.led_err.turn_on)
            finally:
                self._ui(self.led_cmp.stop_blink, True)
                self._ui(self.status_var.set, "IDLE")
                self._ui(self.status_lbl.config, fg=PCB_LED_GRN)

        threading.Thread(target=_worker, daemon=True).start()

    def _show_compare(self, labels, rows, file_count):
        cols = ["Register"] + labels
        self.result_table.reconfigure_columns(cols)
        self.result_table.clear()
        for row in rows:
            self.result_table.add_row(row, tag="diff")

        if rows:
            self.cmp_title.config(
                text=f"⚡  {len(rows)} differing register(s) across {file_count} file(s)",
                fg=PCB_LED_YLW)
            self.log(f"Compare done — {len(rows)} differences.", "warn")
        else:
            self.cmp_title.config(text="✔  All registers match!", fg=PCB_OK)
            self.log("Compare done — all registers match.", "ok")

        self._stored_labels = labels
        self._stored_rows = rows
        self.export_btn.config(state="normal")
        self._nb.select(1)

    # ── File list ────────────────────────────
    def _refresh_file_list(self):
        self.file_lb.delete(0, "end")
        for fp in self._get_register_files():
            sz = os.path.getsize(fp) // 1024
            self.file_lb.insert("end", f"  {os.path.basename(fp)}  ({sz} KB)")
        self._next_file_index = self._detect_next_index()
        self._update_poll_label()

    def _open_dir(self):
        import subprocess
        subprocess.Popen(f'explorer "{OUTPUT_DIR}"')

    def _delete_file(self):
        sel = self.file_lb.curselection()
        if not sel:
            return
        files = self._get_register_files()
        idx = sel[0]
        if idx >= len(files):
            return
        fp = files[idx]
        name = os.path.basename(fp)
        if messagebox.askyesno("Delete", f"Delete  {name}?"):
            os.remove(fp)
            self.log(f"Deleted: {name}", "warn")
            self._refresh_file_list()

    # ── CSV export ───────────────────────────
    def _export_csv(self):
        if not self._stored_rows:
            return
        fp = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("CSV files", "*.csv")],
            initialdir=OUTPUT_DIR,
            initialfile="compare_results.csv",
        )
        if not fp:
            return
        try:
            with open(fp, "w") as f:
                f.write(",".join(["Register"] + self._stored_labels) + "\n")
                for row in self._stored_rows:
                    f.write(",".join(str(v) for v in row) + "\n")
            self.log(f"Exported → {os.path.basename(fp)}", "ok")
        except Exception as e:
            self.log(f"Export error: {e}", "error")


# ─────────────────────────────────────────────
if __name__ == "__main__":
    app = ModbusApp()
    app.mainloop()
