import os
import queue
import threading
import time
import tkinter as tk
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from tkinter import messagebox, ttk

import numpy as np


def prepare_rtlsdr_dll_path() -> None:
    """Ensure Windows can resolve rtlsdr/librtlsdr DLLs from this app folder."""
    app_dir = Path(__file__).resolve().parent
    if hasattr(os, "add_dll_directory"):
        os.add_dll_directory(str(app_dir))


@dataclass
class ScanConfig:
    sample_rate: float = 2.4e6
    samples_per_read: int = 32768
    gain: float = 36.0
    threshold_db: float = 8.0
    band_start_mhz: float = 380.0
    band_end_mhz: float = 400.0
    channels: int = 200


class SDRBackendBase:
    def read_samples(self, center_freq_hz: float, sample_rate: float, num_samples: int, gain: float) -> np.ndarray:
        raise NotImplementedError

    def close(self) -> None:
        return None


class RTLBackend(SDRBackendBase):
    def __init__(self) -> None:
        prepare_rtlsdr_dll_path()
        from rtlsdr import RtlSdr

        self.sdr = RtlSdr()
        # Enable automatic gain control
        self.sdr.gain_mode = False

    def read_samples(self, center_freq_hz: float, sample_rate: float, num_samples: int, gain: float) -> np.ndarray:
        self.sdr.sample_rate = sample_rate
        self.sdr.center_freq = center_freq_hz
        # AGC enabled; gain parameter is ignored
        return self.sdr.read_samples(num_samples)

    def close(self) -> None:
        self.sdr.close()


def compute_spectrum_db(samples: np.ndarray, sample_rate: float) -> tuple[np.ndarray, np.ndarray]:
    window = np.hanning(len(samples))
    win_samples = samples * window
    spectrum = np.fft.fftshift(np.fft.fft(win_samples))
    power = np.abs(spectrum) ** 2
    power_db = 10 * np.log10(power + 1e-12)
    offsets_hz = np.fft.fftshift(np.fft.fftfreq(len(samples), d=1.0 / sample_rate))
    return offsets_hz, power_db


class SDRTestApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("RTL-SDR RF Live Scan")
        self.root.geometry("1200x760")
        self.root.configure(bg="#0b0d10")

        self.config = ScanConfig()

        self.is_running = False
        self.stop_event = threading.Event()
        self.gui_queue: queue.Queue[tuple[str, object]] = queue.Queue()

        self.band_start_hz = self.config.band_start_mhz * 1e6
        self.band_end_hz = self.config.band_end_mhz * 1e6
        self.channel_edges_hz = np.linspace(self.band_start_hz, self.band_end_hz, self.config.channels + 1)
        self.channel_centers_mhz = (self.channel_edges_hz[:-1] + self.channel_edges_hz[1:]) / 2e6

        # 200 channels over 20 MHz => 100 kHz per channel.
        self.channel_width_khz = (self.band_end_hz - self.band_start_hz) / self.config.channels / 1e3

        # A single RTL2832U cannot sample full 20 MHz at once. We stitch sub-bands into one full-cycle snapshot.
        self.capture_centers_mhz = np.arange(381.0, 399.1, 2.0)

        self.baseline_ready = False
        self.baseline_power = np.full(self.config.channels, -95.0)
        self.baseline_std = np.full(self.config.channels, 2.5)
        self.baseline_persistent_mask = np.zeros(self.config.channels, dtype=bool)
        self.current_power = np.full(self.config.channels, -120.0)

        self.current_peak_db = -120.0
        self.current_peak_freq_mhz = self.config.band_start_mhz
        self.current_delta_db = 0.0

        self.last_marker = "geen"

        self.scan_gain = self.config.gain
        self.scan_threshold_db = self.config.threshold_db

        self.monitor_cycle_count = 0
        self.alert_streak = 0
        self.warmup_cycles = 3
        self.level_text = "WACHT"

        # Live denoising/state tracking to suppress fixed mast carriers and random spikes.
        self.delta_ema = np.zeros(self.config.channels, dtype=float)
        self.occupancy_ema = np.zeros(self.config.channels, dtype=float)
        self.delta_history: deque[np.ndarray] = deque(maxlen=6)

        self._build_ui()
        self._poll_queue()
        self._start_bootstrap_baseline()

    def _build_ui(self) -> None:
        self.root.rowconfigure(0, weight=1)
        self.root.columnconfigure(0, weight=1)

        main = tk.Frame(self.root, bg="#0b0d10")
        main.grid(row=0, column=0, sticky="nsew")
        main.rowconfigure(0, weight=1)
        main.rowconfigure(1, weight=0)
        main.columnconfigure(0, weight=1)

        top = tk.Frame(main, bg="#0b0d10")
        top.grid(row=0, column=0, sticky="nsew", padx=24, pady=(16, 8))
        top.columnconfigure(0, weight=1)

        title = tk.Label(
            top,
            text="RTL-SDR RF\nAnomaly Scan",
            bg="#0b0d10",
            fg="#e8edf2",
            font=("Segoe UI", 18, "bold"),
            justify="center",
        )
        title.grid(row=0, column=0, pady=(4, 8))

        control_row = tk.Frame(top, bg="#0b0d10")
        control_row.grid(row=1, column=0, pady=(0, 10))

        ttk.Label(control_row, text="Gain").grid(row=0, column=0, padx=(0, 6))
        self.gain_var = tk.DoubleVar(value=self.config.gain)
        ttk.Spinbox(control_row, from_=0, to=49.6, increment=0.1, textvariable=self.gain_var, width=7).grid(
            row=0, column=1, padx=(0, 14)
        )

        ttk.Label(control_row, text="Threshold +dB").grid(row=0, column=2, padx=(0, 6))
        self.threshold_var = tk.DoubleVar(value=self.config.threshold_db)
        ttk.Scale(control_row, from_=3.0, to=18.0, variable=self.threshold_var, orient="horizontal", length=180).grid(
            row=0, column=3
        )

        self.status_canvas = tk.Canvas(top, width=180, height=180, bg="#0b0d10", highlightthickness=0)
        self.status_canvas.grid(row=2, column=0, pady=(4, 4))
        self.status_circle = self.status_canvas.create_oval(18, 18, 162, 162, fill="#00cc4d", outline="#1aff66", width=2)

        self.state_label = tk.Label(top, text="GROEN\n(Normaal)", bg="#0b0d10", fg="#16f26d", font=("Segoe UI", 15, "bold"))
        self.state_label.grid(row=3, column=0)

        self.peak_label = tk.Label(top, text="Piek: -120.0 dBFS", bg="#0b0d10", fg="#55d8ff", font=("Consolas", 20, "bold"))
        self.peak_label.grid(row=4, column=0, pady=(10, 2))

        self.delta_label = tk.Label(
            top,
            text="Delta: +0.0 dB | Basis: -95.0 dBFS",
            bg="#0b0d10",
            fg="#d0d4dc",
            font=("Segoe UI", 12),
        )
        self.delta_label.grid(row=5, column=0, pady=(0, 2))

        self.freq_label = tk.Label(
            top,
            text=f"Sterkste piek: {self.current_peak_freq_mhz:.3f} MHz | Kanaalbreedte: {self.channel_width_khz:.0f} kHz",
            bg="#0b0d10",
            fg="#d0d4dc",
            font=("Segoe UI", 11),
        )
        self.freq_label.grid(row=6, column=0, pady=(0, 8))

        self.strip_canvas = tk.Canvas(top, width=980, height=36, bg="#121821", highlightthickness=1, highlightbackground="#2a3441")
        self.strip_canvas.grid(row=7, column=0, pady=(10, 8))

        strip_labels = tk.Frame(top, bg="#0b0d10")
        strip_labels.grid(row=8, column=0, sticky="ew")
        strip_labels.columnconfigure(0, weight=1)
        strip_labels.columnconfigure(1, weight=1)
        tk.Label(strip_labels, text=f"{self.config.band_start_mhz:.0f} MHz", bg="#0b0d10", fg="#8e98a8").grid(row=0, column=0, sticky="w")
        tk.Label(strip_labels, text=f"{self.config.band_end_mhz:.0f} MHz", bg="#0b0d10", fg="#8e98a8").grid(row=0, column=1, sticky="e")

        buttons = tk.Frame(main, bg="#0b0d10")
        buttons.grid(row=1, column=0, pady=(6, 18))

        self.btn_start = tk.Button(
            buttons,
            text="Start",
            bg="#13c249",
            fg="white",
            activebackground="#10a53e",
            activeforeground="white",
            width=10,
            height=2,
            command=self.start_monitor,
            relief="flat",
            state="disabled",
        )
        self.btn_start.grid(row=0, column=0, padx=8)

        self.btn_stop = tk.Button(
            buttons,
            text="Stop",
            bg="#e63737",
            fg="white",
            activebackground="#c11f1f",
            activeforeground="white",
            width=10,
            height=2,
            state="disabled",
            command=self.stop_monitor,
            relief="flat",
        )
        self.btn_stop.grid(row=0, column=1, padx=8)

        tk.Label(buttons, text="Testrit markers", bg="#0b0d10", fg="#d3d9e3", font=("Segoe UI", 10, "bold")).grid(
            row=1, column=0, columnspan=2, pady=(10, 4)
        )

        marker_row = tk.Frame(buttons, bg="#0b0d10")
        marker_row.grid(row=2, column=0, columnspan=2)

        tk.Button(marker_row, text="Vals alarm", bg="#b843ea", fg="white", relief="flat", command=lambda: self._set_marker("vals alarm")).grid(
            row=0, column=0, padx=6
        )
        tk.Button(marker_row, text="Middelmatig", bg="#f1a500", fg="black", relief="flat", command=lambda: self._set_marker("middelmatig")).grid(
            row=0, column=1, padx=6
        )
        tk.Button(marker_row, text="Sterk / Hulpdienst", bg="#e33434", fg="white", relief="flat", command=lambda: self._set_marker("sterk/hulpdienst")).grid(
            row=0, column=2, padx=6
        )

        self.marker_label = tk.Label(buttons, text="Laatste marker: geen", bg="#0b0d10", fg="#bec6d3", font=("Segoe UI", 10))
        self.marker_label.grid(row=3, column=0, columnspan=2, pady=(10, 2))

        self.log_label = tk.Label(buttons, text="Bereid voor scan...", bg="#0b0d10", fg="#bec6d3", font=("Segoe UI", 10))
        self.log_label.grid(row=4, column=0, columnspan=2)

    def _set_marker(self, marker: str) -> None:
        self.last_marker = marker
        self.marker_label.configure(text=f"Laatste marker: {marker}")

    def _set_state_visual(self, level: str) -> None:
        if level == "red":
            fill = "#ff2d2d"
            outline = "#ff5555"
            text = "ROOD\n(Hulpdienst?)"
            color = "#ff5d5d"
        elif level == "yellow":
            fill = "#f5bb19"
            outline = "#ffd255"
            text = "GEEL\n(Verhoogd)"
            color = "#ffd255"
        elif level == "neutral":
            fill = "#3f7cff"
            outline = "#73a2ff"
            text = "WACHT\n(Calibratie)"
            color = "#8cb4ff"
        else:
            fill = "#00cc4d"
            outline = "#1aff66"
            text = "GROEN\n(Normaal)"
            color = "#16f26d"

        self.status_canvas.itemconfigure(self.status_circle, fill=fill, outline=outline)
        self.state_label.configure(text=text, fg=color)

    def _log(self, text: str) -> None:
        self.log_label.configure(text=text)

    def _start_bootstrap_baseline(self) -> None:
        self._set_state_visual("neutral")
        self._log("Auto-calibratie bij opstart... (200 kanalen)")
        threading.Thread(
            target=self._baseline_worker,
            args=(float(self.config.gain), 14),
            daemon=True,
        ).start()

    def _compute_channel_max_from_capture(self, center_freq_hz: float, samples: np.ndarray) -> np.ndarray:
        offsets_hz, power_db = compute_spectrum_db(samples, self.config.sample_rate)
        abs_freq_hz = center_freq_hz + offsets_hz

        in_band = (abs_freq_hz >= self.band_start_hz) & (abs_freq_hz < self.band_end_hz)
        if not np.any(in_band):
            return np.full(self.config.channels, -np.inf)

        freq_sel = abs_freq_hz[in_band]
        pwr_sel = power_db[in_band]

        channel_idx = np.digitize(freq_sel, self.channel_edges_hz) - 1
        valid = (channel_idx >= 0) & (channel_idx < self.config.channels)
        channel_idx = channel_idx[valid]
        pwr_sel = pwr_sel[valid]

        out = np.full(self.config.channels, -np.inf)
        if channel_idx.size:
            np.maximum.at(out, channel_idx, pwr_sel)
        return out

    def _scan_full_band_cycle(self, backend: SDRBackendBase, gain: float) -> np.ndarray:
        cycle_max = np.full(self.config.channels, -np.inf)

        for center_mhz in self.capture_centers_mhz:
            if self.stop_event.is_set():
                break

            samples = backend.read_samples(
                center_mhz * 1e6,
                self.config.sample_rate,
                self.config.samples_per_read,
                gain,
            )
            local_max = self._compute_channel_max_from_capture(center_mhz * 1e6, samples)
            cycle_max = np.maximum(cycle_max, local_max)

        cycle_max[~np.isfinite(cycle_max)] = -140.0
        return cycle_max

    def _baseline_worker(self, gain: float, cycles: int = 12) -> None:
        backend: SDRBackendBase | None = None
        try:
            backend = RTLBackend()

            all_cycles: list[np.ndarray] = []
            for i in range(cycles):
                if self.stop_event.is_set():
                    break
                band = self._scan_full_band_cycle(backend, gain)
                all_cycles.append(band)
                self.gui_queue.put(("baseline_progress", (i + 1, cycles)))

            if not all_cycles:
                raise RuntimeError("Geen baseline data ontvangen")

            baseline_stack = np.vstack(all_cycles)
            # Robust baseline so existing static carriers don't trigger false alerts.
            self.baseline_power = np.percentile(baseline_stack, 60, axis=0)
            self.baseline_std = np.std(baseline_stack, axis=0) + 1.6

            p50 = np.percentile(baseline_stack, 50, axis=0)
            p90 = np.percentile(baseline_stack, 90, axis=0)
            hot_cutoff = np.percentile(p50, 85)
            # Channels that are both hot and stable are likely fixed mast/control carriers.
            self.baseline_persistent_mask = (p50 >= hot_cutoff) & ((p90 - p50) <= 2.0)

            self.baseline_ready = True
            self.gui_queue.put(("baseline_done", None))

        except Exception as exc:
            self.gui_queue.put(("error", f"Baseline mislukt: {exc}"))
        finally:
            if backend is not None:
                backend.close()
            self.gui_queue.put(("baseline_ui_ready", None))

    def start_monitor(self) -> None:
        if self.is_running:
            return

        if not self.baseline_ready:
            messagebox.showwarning("Baseline vereist", "Draai eerst baseline.")
            return

        self.scan_gain = float(self.gain_var.get())
        self.scan_threshold_db = float(self.threshold_var.get())

        # Reset live logic so colors remain stable at each fresh start.
        self.monitor_cycle_count = 0
        self.alert_streak = 0
        self._set_state_visual("green")
        self.delta_ema.fill(0.0)
        self.occupancy_ema.fill(0.0)
        self.delta_history.clear()

        self.stop_event.clear()
        self.is_running = True

        self.btn_start.configure(state="disabled")
        self.btn_stop.configure(state="normal")

        self._log("Live scan actief: 200 kanalen, volledige 20 MHz per cyclus")
        threading.Thread(target=self._monitor_worker, daemon=True).start()

    def stop_monitor(self) -> None:
        if not self.is_running:
            return
        self.stop_event.set()
        self._log("Stoppen...")

    def _monitor_worker(self) -> None:
        backend: SDRBackendBase | None = None
        try:
            backend = RTLBackend()

            while not self.stop_event.is_set():
                band_power = self._scan_full_band_cycle(backend, self.scan_gain)
                delta = band_power - self.baseline_power

                self.delta_history.append(delta.copy())
                if len(self.delta_history) >= 3:
                    temporal_delta = np.median(np.vstack(list(self.delta_history)[-3:]), axis=0)
                else:
                    temporal_delta = delta

                zscore = temporal_delta / np.maximum(self.baseline_std, 0.9)

                prev_delta_ema = self.delta_ema.copy()
                self.delta_ema = (self.delta_ema * 0.92) + (temporal_delta * 0.08)
                delta_rise = temporal_delta - prev_delta_ema

                occ_hit = temporal_delta >= (self.scan_threshold_db * 0.7)
                self.occupancy_ema = (self.occupancy_ema * 0.97) + (occ_hit.astype(float) * 0.03)
                persistent_mask = (self.occupancy_ema >= 0.72) | self.baseline_persistent_mask

                local_bg = (np.roll(band_power, 1) + np.roll(band_power, -1)) * 0.5
                prominence = band_power - local_bg

                idx = int(np.argmax(temporal_delta))
                peak_delta = float(temporal_delta[idx])
                peak_power = float(band_power[idx])
                peak_freq = float(self.channel_centers_mhz[idx])

                transient_ok = (~persistent_mask) | (delta_rise >= 2.5)
                medium_mask = (
                    (temporal_delta >= self.scan_threshold_db)
                    & (zscore >= 3.0)
                    & transient_ok
                    & (prominence >= 1.5)
                )
                strong_mask = (
                    (temporal_delta >= self.scan_threshold_db + 4.0)
                    & (zscore >= 4.0)
                    & ((~persistent_mask) | (delta_rise >= 3.5))
                    & (prominence >= 2.5)
                )

                medium_cluster = self._max_cluster_len(medium_mask)
                strong_cluster = self._max_cluster_len(strong_mask)

                candidate_level = "none"
                if strong_cluster >= 2:
                    candidate_level = "red"
                elif medium_cluster >= 2:
                    candidate_level = "yellow"

                self.monitor_cycle_count += 1

                if self.monitor_cycle_count <= self.warmup_cycles:
                    level = "green"
                    self.alert_streak = 0
                else:
                    if candidate_level == "red":
                        self.alert_streak += 2
                    elif candidate_level == "yellow":
                        self.alert_streak += 1
                    else:
                        self.alert_streak = max(0, self.alert_streak - 1)

                    if self.alert_streak >= 6:
                        level = "red"
                    elif self.alert_streak >= 3:
                        level = "yellow"
                    else:
                        level = "green"

                # Adapt baseline slowly only for non-alert channels.
                calm = (temporal_delta < (self.scan_threshold_db * 0.5)) & (~persistent_mask)
                if np.any(calm):
                    self.baseline_power[calm] = (self.baseline_power[calm] * 0.995) + (band_power[calm] * 0.005)

                self.gui_queue.put(
                    (
                        "cycle",
                        {
                            "band_power": band_power,
                            "peak_delta": peak_delta,
                            "peak_power": peak_power,
                            "peak_freq": peak_freq,
                            "level": level,
                            "baseline_at_peak": float(self.baseline_power[idx]),
                        },
                    )
                )

                if level != "green":
                    self.gui_queue.put(("log", f"ALERT {peak_freq:.3f} MHz | Delta +{peak_delta:.1f} dB"))

        except Exception as exc:
            self.gui_queue.put(("error", f"Live scan fout: {exc}"))
        finally:
            if backend is not None:
                backend.close()
            self.gui_queue.put(("stopped", None))

    def _draw_channel_strip(self, band_power: np.ndarray) -> None:
        self.strip_canvas.delete("all")
        width = int(self.strip_canvas.winfo_width())
        height = int(self.strip_canvas.winfo_height())
        if width <= 2 or height <= 2:
            width = 980
            height = 36

        norm = np.clip((band_power + 120.0) / 55.0, 0.0, 1.0)
        dx = max(1, width // self.config.channels)

        for i, v in enumerate(norm):
            x0 = i * dx
            x1 = x0 + dx
            # Blue -> Orange -> Red
            if v < 0.55:
                t = v / 0.55
                r = int(40 + t * 120)
                g = int(70 + t * 90)
                b = int(170 + t * 30)
            else:
                t = (v - 0.55) / 0.45
                r = int(160 + t * 95)
                g = int(160 - t * 120)
                b = int(90 - t * 80)
            color = f"#{r:02x}{g:02x}{max(0, b):02x}"
            self.strip_canvas.create_rectangle(x0, 0, x1, height, fill=color, outline="")

    @staticmethod
    def _max_cluster_len(mask: np.ndarray) -> int:
        max_len = 0
        cur = 0
        for hit in mask:
            if hit:
                cur += 1
                if cur > max_len:
                    max_len = cur
            else:
                cur = 0
        return max_len

    def _poll_queue(self) -> None:
        try:
            while True:
                event, payload = self.gui_queue.get_nowait()

                if event == "baseline_progress":
                    done, total = payload
                    self._log(f"Baseline {done}/{total} ...")

                elif event == "baseline_done":
                    self._set_state_visual("green")
                    self._log("Calibratie klaar. Klaar om live te starten.")

                elif event == "baseline_ui_ready":
                    if self.baseline_ready:
                        self.btn_start.configure(state="normal")
                    else:
                        self.btn_start.configure(state="disabled")
                        self._log("Calibratie mislukt: controleer RTL-SDR verbinding.")

                elif event == "cycle":
                    self.current_power = payload["band_power"]
                    self.current_peak_db = float(payload["peak_power"])
                    self.current_peak_freq_mhz = float(payload["peak_freq"])
                    self.current_delta_db = float(payload["peak_delta"])

                    baseline_at_peak = float(payload["baseline_at_peak"])
                    level = payload["level"]

                    self._set_state_visual(level)
                    self._draw_channel_strip(self.current_power)

                    self.peak_label.configure(text=f"Piek: {self.current_peak_db:.1f} dBFS")
                    self.delta_label.configure(
                        text=f"Delta: {self.current_delta_db:+.1f} dB | Basis: {baseline_at_peak:.1f} dBFS"
                    )
                    self.freq_label.configure(
                        text=(
                            f"Sterkste piek: {self.current_peak_freq_mhz:.3f} MHz | "
                            f"200 kanalen ({self.channel_width_khz:.0f} kHz/kanaal)"
                        )
                    )

                elif event == "log":
                    self._log(str(payload))

                elif event == "stopped":
                    self.is_running = False
                    self.btn_stop.configure(state="disabled")
                    self.btn_start.configure(state="normal")
                    self._log("Live scan gestopt.")

                elif event == "error":
                    self._set_state_visual("red")
                    self._log(str(payload))
                    messagebox.showerror("Error", str(payload))

        except queue.Empty:
            pass

        self.root.after(60, self._poll_queue)


def main() -> None:
    root = tk.Tk()
    style = ttk.Style(root)
    if "clam" in style.theme_names():
        style.theme_use("clam")

    app = SDRTestApp(root)

    def on_close() -> None:
        app.stop_event.set()
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)
    root.mainloop()


if __name__ == "__main__":
    main()
