#!/usr/bin/env python3
"""
All-in-one RTL-SDR + Bluetooth tool.

One file with two modes:
1) scanner: Raspberry Pi RTL-SDR scan + Bluetooth JSON transmit
2) receiver: Bluetooth/serial JSON receive + console + CSV logging

Compatibility:
- Running without arguments defaults to scanner mode.
"""

from __future__ import annotations

import argparse
import csv
import importlib
import json
import logging
import os
import subprocess
import sys
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np

try:
    serial: Any = importlib.import_module("serial")
except ModuleNotFoundError:
    print("ERROR: pyserial is not installed. Install with: python3 -m pip install --user pyserial")
    raise SystemExit(1)


LOGGER = logging.getLogger("rpi_live_scanner")


def default_log_path() -> str:
    var_log_path = Path("/var/log/rpi_scanner.log")
    try:
        var_log_path.parent.mkdir(parents=True, exist_ok=True)
        with var_log_path.open("a", encoding="utf-8"):
            pass
        return str(var_log_path)
    except OSError:
        fallback = Path.home() / "rpi_scanner.log"
        return str(fallback)


def setup_logging(log_file: str | None = None, debug: bool = False) -> None:
    LOGGER.handlers.clear()
    LOGGER.setLevel(logging.DEBUG if debug else logging.INFO)
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    LOGGER.addHandler(stream_handler)

    if log_file:
        file_path = Path(log_file)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(str(file_path), encoding="utf-8")
        file_handler.setFormatter(formatter)
        LOGGER.addHandler(file_handler)


@dataclass
class ScanConfig:
    sample_rate: float = 2.4e6
    samples_per_read: int = 32768
    threshold_db: float = 8.0
    band_start_mhz: float = 380.0
    band_end_mhz: float = 400.0
    channels: int = 200
    baseline_cycles: int = 14
    scan_delay_sec: float = 0.1
    bt_port: str = "/dev/rfcomm0"
    bt_baudrate: int = 115200


class RTLBackend:
    """RTL-SDR interface with AGC enabled."""

    def __init__(self) -> None:
        from rtlsdr import RtlSdr

        self.sdr = RtlSdr()
        self.sdr.gain_mode = False
        LOGGER.info("RTL-SDR initialized (AGC enabled)")

    def read_samples(self, center_freq_hz: float, sample_rate: float, num_samples: int) -> np.ndarray:
        self.sdr.sample_rate = sample_rate
        self.sdr.center_freq = center_freq_hz
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


class RPiScanner:
    def __init__(self, config: ScanConfig) -> None:
        self.config = config
        self.is_running = False
        self.backend: RTLBackend | None = None
        self.bt_serial: Any | None = None

        self.band_start_hz = self.config.band_start_mhz * 1e6
        self.band_end_hz = self.config.band_end_mhz * 1e6
        self.channel_edges_hz = np.linspace(self.band_start_hz, self.band_end_hz, self.config.channels + 1)
        self.channel_centers_mhz = (self.channel_edges_hz[:-1] + self.channel_edges_hz[1:]) / 2e6
        self.channel_width_khz = (self.band_end_hz - self.band_start_hz) / self.config.channels / 1e3

        self.capture_centers_mhz = np.arange(self.config.band_start_mhz + 1.0, self.config.band_end_mhz, 2.0)

        self.baseline_ready = False
        self.baseline_power = np.full(self.config.channels, -95.0)
        self.background_power = np.full(self.config.channels, -95.0)
        self.baseline_std = np.full(self.config.channels, 2.0)
        self.baseline_persistent_mask = np.zeros(self.config.channels, dtype=bool)

        self.current_power = np.full(self.config.channels, -120.0)
        self.current_peak_db = -120.0
        self.current_peak_freq_mhz = self.config.band_start_mhz
        self.current_delta_db = 0.0
        self.current_alert = False

        self.delta_ema = np.zeros(self.config.channels, dtype=float)
        self.occupancy_ema = np.zeros(self.config.channels, dtype=float)
        self.delta_history: deque[np.ndarray] = deque(maxlen=6)
        self.monitor_cycle_count = 0
        self.bt_reconnect_interval_sec = 5.0
        self._last_bt_reconnect_try = 0.0

    def connect_bluetooth(self) -> bool:
        try:
            self.bt_serial = serial.Serial(self.config.bt_port, self.config.bt_baudrate, timeout=1.0)
            LOGGER.info("Bluetooth connected on %s", self.config.bt_port)
            return True
        except Exception as exc:
            LOGGER.warning("Bluetooth connect failed on %s: %s", self.config.bt_port, exc)
            self.bt_serial = None
            return False

    def ensure_bluetooth_connected(self, force: bool = False) -> bool:
        if self.bt_serial:
            return True
        now = time.time()
        if not force and (now - self._last_bt_reconnect_try) < self.bt_reconnect_interval_sec:
            return False
        self._last_bt_reconnect_try = now
        return self.connect_bluetooth()

    def send_bt_data(self, data: dict) -> None:
        if not self.bt_serial:
            return
        try:
            self.bt_serial.write((json.dumps(data) + "\n").encode("utf-8"))
        except Exception as exc:
            LOGGER.warning("Bluetooth send error, will reconnect: %s", exc)
            try:
                self.bt_serial.close()
            except Exception:
                pass
            self.bt_serial = None

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

    def _scan_full_band_cycle(self) -> np.ndarray:
        cycle_max = np.full(self.config.channels, -np.inf)

        if not self.backend:
            raise RuntimeError("RTL backend not initialized")

        for center_mhz in self.capture_centers_mhz:
            center_hz = center_mhz * 1e6
            samples = self.backend.read_samples(center_hz, self.config.sample_rate, self.config.samples_per_read)
            local_max = self._compute_channel_max_from_capture(center_hz, samples)
            cycle_max = np.maximum(cycle_max, local_max)

        cycle_max[~np.isfinite(cycle_max)] = -140.0
        return cycle_max

    @staticmethod
    def _max_cluster_len(mask: np.ndarray) -> int:
        max_len = 0
        cur_len = 0
        for val in mask:
            if val:
                cur_len += 1
                if cur_len > max_len:
                    max_len = cur_len
            else:
                cur_len = 0
        return max_len

    def run_baseline(self) -> None:
        LOGGER.info("Baseline start (%d cycles)", self.config.baseline_cycles)
        self.send_bt_data({"status": "BASELINE_START", "cycles_remaining": self.config.baseline_cycles})

        baseline_rows: list[np.ndarray] = []

        for cycle in range(self.config.baseline_cycles):
            power = self._scan_full_band_cycle()
            baseline_rows.append(power)
            remaining = self.config.baseline_cycles - cycle - 1
            LOGGER.info("Baseline cycle %d/%d", cycle + 1, self.config.baseline_cycles)
            self.send_bt_data({"status": "BASELINE", "cycle": cycle + 1, "cycles_remaining": remaining})
            time.sleep(0.5)

        baseline_stack = np.vstack(baseline_rows)
        self.baseline_power = np.percentile(baseline_stack, 60, axis=0)
        self.background_power = self.baseline_power.copy()
        self.baseline_std = np.maximum(np.std(baseline_stack, axis=0), 1.6)

        p50 = np.percentile(baseline_stack, 50, axis=0)
        p90 = np.percentile(baseline_stack, 90, axis=0)
        hot_cutoff = np.percentile(p50, 85)
        self.baseline_persistent_mask = (p50 >= hot_cutoff) & ((p90 - p50) <= 2.0)

        self.baseline_ready = True
        LOGGER.info("Baseline ready. Persistent channels: %d", int(np.sum(self.baseline_persistent_mask)))
        self.send_bt_data(
            {
                "status": "BASELINE_READY",
                "persistent_channels": int(np.sum(self.baseline_persistent_mask)),
            }
        )

    def run_monitor(self) -> None:
        LOGGER.info("Live monitor started")
        LOGGER.info("Band: %.1f-%.1f MHz | channels: %d | width: %.1f kHz", self.config.band_start_mhz, self.config.band_end_mhz, self.config.channels, self.channel_width_khz)
        self.send_bt_data({"status": "SCANNING"})

        warmup_cycles = 3
        alert_streak = 0

        while self.is_running:
            self.ensure_bluetooth_connected()
            power = self._scan_full_band_cycle()
            self.current_power = power
            self.monitor_cycle_count += 1

            # Use a learned background for delta instead of absolute power.
            delta = power - self.background_power
            self.delta_history.append(delta.copy())

            if len(self.delta_history) >= 3:
                temporal_delta = np.median(np.vstack(list(self.delta_history)[-3:]), axis=0)
            else:
                temporal_delta = delta

            prev_delta_ema = self.delta_ema.copy()
            self.delta_ema = (self.delta_ema * 0.92) + (temporal_delta * 0.08)
            delta_rise = temporal_delta - prev_delta_ema

            occ_hit = temporal_delta >= (self.config.threshold_db * 0.7)
            self.occupancy_ema = (self.occupancy_ema * 0.97) + (occ_hit.astype(float) * 0.03)
            persistent_mask = (self.occupancy_ema >= 0.72) | self.baseline_persistent_mask

            zscore = temporal_delta / np.maximum(self.baseline_std, 0.9)
            local_bg = (np.roll(power, 1) + np.roll(power, -1)) * 0.5
            prominence = power - local_bg

            transient_ok = (~persistent_mask) | (delta_rise >= 2.5)

            medium_mask = (
                (temporal_delta >= self.config.threshold_db)
                & (zscore >= 3.0)
                & transient_ok
                & (prominence >= 1.5)
            )
            strong_mask = (
                (temporal_delta >= self.config.threshold_db + 4.0)
                & (zscore >= 4.0)
                & ((~persistent_mask) | (delta_rise >= 3.5))
                & (prominence >= 2.5)
            )

            medium_cluster = self._max_cluster_len(medium_mask)
            strong_cluster = self._max_cluster_len(strong_mask)

            candidate_level = "green"
            if strong_cluster >= 2:
                candidate_level = "red"
            elif medium_cluster >= 2:
                candidate_level = "yellow"

            if self.monitor_cycle_count <= warmup_cycles:
                alert_streak = 0
                self.current_alert = False
            else:
                if candidate_level == "red":
                    alert_streak += 2
                elif candidate_level == "yellow":
                    alert_streak += 1
                else:
                    alert_streak = max(0, alert_streak - 1)
                self.current_alert = alert_streak >= 3

            peak_idx = int(np.argmax(temporal_delta))
            self.current_peak_db = float(power[peak_idx])
            self.current_peak_freq_mhz = float(self.channel_centers_mhz[peak_idx])
            self.current_delta_db = float(temporal_delta[peak_idx])

            calm = (temporal_delta < (self.config.threshold_db * 0.5)) & (~persistent_mask)
            if np.any(calm):
                # Keep slow long-term baseline for reference and noise stats.
                self.baseline_power[calm] = (self.baseline_power[calm] * 0.995) + (power[calm] * 0.005)

            # Fast adaptive background learning (friend's suggestion):
            # background = background * 0.95 + current * 0.05
            # Skip strongest anomaly channels to avoid contaminating background.
            learn_mask = ~(strong_mask | medium_mask)
            if np.any(learn_mask):
                self.background_power[learn_mask] = (
                    (self.background_power[learn_mask] * 0.95) + (power[learn_mask] * 0.05)
                )

            anomaly_channels = np.where(strong_mask | medium_mask)[0].tolist()
            payload = {
                "cycle": self.monitor_cycle_count,
                "alert": bool(self.current_alert),
                "level": candidate_level,
                "peak_freq_mhz": self.current_peak_freq_mhz,
                "peak_db": self.current_peak_db,
                "peak_delta_db": self.current_delta_db,
                "num_anomalies": len(anomaly_channels),
                "top_channels": anomaly_channels[:5],
                "power_range": [float(np.min(power)), float(np.max(power))],
            }
            self.send_bt_data(payload)

            if self.current_alert:
                LOGGER.warning(
                    "ALERT cycle=%d freq=%.3f MHz delta=%.1f dB anomalies=%d",
                    self.monitor_cycle_count,
                    self.current_peak_freq_mhz,
                    self.current_delta_db,
                    len(anomaly_channels),
                )

            time.sleep(self.config.scan_delay_sec)

    def run(self) -> None:
        self.is_running = True
        self.backend = RTLBackend()

        try:
            self.run_baseline()
            if not self.baseline_ready:
                raise RuntimeError("Baseline failed")
            self.run_monitor()
        finally:
            self.stop()

    def stop(self) -> None:
        self.is_running = False
        if self.backend:
            self.backend.close()
            self.backend = None
        if self.bt_serial:
            self.bt_serial.close()
            self.bt_serial = None
        LOGGER.info("Scanner stopped")


def try_rfcomm_bind(device_path: str, target_mac: str) -> None:
    if os.path.exists(device_path):
        return
    LOGGER.info("Trying rfcomm bind: %s -> %s", device_path, target_mac)
    try:
        subprocess.run(["rfcomm", "bind", device_path, target_mac], check=True)
        LOGGER.info("rfcomm bind success")
    except Exception as exc:
        LOGGER.warning("rfcomm bind failed (%s). You can run manually: sudo rfcomm bind %s %s", exc, device_path, target_mac)


def get_first_paired_mac() -> str:
    """Return first paired Bluetooth device MAC from bluetoothctl, or empty string."""
    try:
        result = subprocess.run(
            ["bluetoothctl", "paired-devices"],
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            return ""
        for line in result.stdout.splitlines():
            # Expected format: Device XX:XX:XX:XX:XX:XX Name
            parts = line.strip().split()
            if len(parts) >= 2 and parts[0] == "Device":
                return parts[1]
    except Exception:
        return ""
    return ""


def ensure_rfcomm_device(device_path: str, preferred_mac: str = "") -> str:
    """Ensure rfcomm device exists. Returns MAC used for bind or empty string."""
    if os.path.exists(device_path):
        return preferred_mac

    mac_to_use = preferred_mac.strip()
    if not mac_to_use:
        mac_to_use = get_first_paired_mac()
        if mac_to_use:
            LOGGER.info("Auto-selected paired phone MAC: %s", mac_to_use)

    if not mac_to_use:
        return ""

    try:
        subprocess.run(["rfcomm", "release", device_path], check=False)
    except Exception:
        pass

    try_rfcomm_bind(device_path, mac_to_use)
    if os.path.exists(device_path):
        return mac_to_use
    return ""


def run_scanner_mode(args: argparse.Namespace) -> int:
    config = ScanConfig(
        sample_rate=getattr(args, "sample_rate", 2.4e6),
        samples_per_read=getattr(args, "samples_per_read", 32768),
        threshold_db=getattr(args, "threshold_db", 8.0),
        band_start_mhz=getattr(args, "band_start_mhz", 380.0),
        band_end_mhz=getattr(args, "band_end_mhz", 400.0),
        channels=getattr(args, "channels", 200),
        baseline_cycles=getattr(args, "baseline_cycles", 14),
        scan_delay_sec=getattr(args, "scan_delay_sec", 0.1),
        bt_port=getattr(args, "bt_port", "/dev/rfcomm0"),
        bt_baudrate=getattr(args, "bt_baudrate", 115200),
    )

    used_mac = ensure_rfcomm_device(config.bt_port, getattr(args, "auto_bind_mac", ""))

    if not os.path.exists(config.bt_port):
        LOGGER.warning(
            "Bluetooth device %s not found. Pair phone with Pi Bluetooth first; scanner will auto-connect once paired.",
            config.bt_port,
        )
    elif used_mac:
        LOGGER.info("rfcomm ready on %s using %s", config.bt_port, used_mac)
    else:
        LOGGER.info("rfcomm ready on %s", config.bt_port)

    scanner = RPiScanner(config)
    if not scanner.ensure_bluetooth_connected(force=True):
        LOGGER.warning("Continuing without Bluetooth output")

    try:
        scanner.run()
    except KeyboardInterrupt:
        LOGGER.info("Keyboard interrupt received")
        scanner.stop()
    except Exception as exc:
        LOGGER.error("Fatal scanner error: %s", exc)
        scanner.stop()
        return 1

    return 0


def open_serial_with_retry(port: str, baudrate: int, timeout: float, retries: int, retry_delay: float) -> Any:
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            ser = serial.Serial(port, baudrate, timeout=timeout)
            LOGGER.info("Receiver connected: %s @ %d", port, baudrate)
            return ser
        except Exception as exc:
            last_exc = exc
            LOGGER.warning("Receiver connect attempt %d/%d failed: %s", attempt, retries, exc)
            if attempt < retries:
                time.sleep(retry_delay)

    raise RuntimeError(f"Cannot open serial port {port}: {last_exc}")


def run_receiver_mode(args: argparse.Namespace) -> int:
    csv_writer = None
    csv_file_obj = None

    if args.output_csv:
        csv_path = Path(args.output_csv)
        csv_path.parent.mkdir(parents=True, exist_ok=True)
        csv_file_obj = csv_path.open("a", newline="", encoding="utf-8")
        csv_writer = csv.DictWriter(
            csv_file_obj,
            fieldnames=[
                "timestamp",
                "cycle",
                "alert",
                "level",
                "peak_freq_mhz",
                "peak_db",
                "peak_delta_db",
                "num_anomalies",
                "power_min",
                "power_max",
            ],
        )
        if csv_path.stat().st_size == 0:
            csv_writer.writeheader()

    ser = None
    try:
        ser = open_serial_with_retry(args.port, args.baudrate, args.timeout, args.retries, args.retry_delay)
        LOGGER.info("Receiver active. Press Ctrl+C to stop")

        while True:
            raw = ser.readline()
            if not raw:
                continue

            text = raw.decode("utf-8", errors="ignore").strip()
            if not text:
                continue

            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                LOGGER.debug("Malformed line ignored: %s", text[:120])
                continue

            ts = datetime.now().isoformat()

            if data.get("status"):
                LOGGER.info("STATUS: %s", data)
                continue

            cycle = int(data.get("cycle", 0))
            alert = bool(data.get("alert", False))
            level = data.get("level", "none")
            peak_freq = float(data.get("peak_freq_mhz", 0.0))
            peak_db = float(data.get("peak_db", 0.0))
            peak_delta = float(data.get("peak_delta_db", 0.0))
            num_anomalies = int(data.get("num_anomalies", 0))
            power_range = data.get("power_range", [0.0, 0.0])

            if csv_writer:
                csv_writer.writerow(
                    {
                        "timestamp": ts,
                        "cycle": cycle,
                        "alert": alert,
                        "level": level,
                        "peak_freq_mhz": peak_freq,
                        "peak_db": peak_db,
                        "peak_delta_db": peak_delta,
                        "num_anomalies": num_anomalies,
                        "power_min": float(power_range[0]),
                        "power_max": float(power_range[1]),
                    }
                )
                csv_file_obj.flush()

            if not args.quiet:
                status = "ALERT" if alert else "OK"
                print(
                    f"[{ts}] {status} cycle={cycle:4d} level={level:>6s} "
                    f"peak={peak_freq:7.3f}MHz p={peak_db:7.2f}dB delta={peak_delta:+6.2f} anomalies={num_anomalies}"
                )

    except KeyboardInterrupt:
        LOGGER.info("Receiver interrupted")
    except Exception as exc:
        LOGGER.error("Receiver error: %s", exc)
        return 1
    finally:
        if ser:
            ser.close()
        if csv_file_obj:
            csv_file_obj.close()

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="All-in-one RTL-SDR scanner/receiver")
    parser.add_argument("--log-file", default=default_log_path(), help="Path to log file")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")

    subparsers = parser.add_subparsers(dest="mode")

    p_scan = subparsers.add_parser("scanner", help="Run Raspberry Pi scanner")
    p_scan.add_argument("--sample-rate", type=float, default=2.4e6)
    p_scan.add_argument("--samples-per-read", type=int, default=32768)
    p_scan.add_argument("--threshold-db", type=float, default=8.0)
    p_scan.add_argument("--band-start-mhz", type=float, default=380.0)
    p_scan.add_argument("--band-end-mhz", type=float, default=400.0)
    p_scan.add_argument("--channels", type=int, default=200)
    p_scan.add_argument("--baseline-cycles", type=int, default=14)
    p_scan.add_argument("--scan-delay-sec", type=float, default=0.1)
    p_scan.add_argument("--bt-port", default="/dev/rfcomm0")
    p_scan.add_argument("--bt-baudrate", type=int, default=115200)
    p_scan.add_argument("--auto-bind-mac", default="", help="Optional MAC for auto rfcomm bind")

    p_recv = subparsers.add_parser("receiver", help="Run serial/Bluetooth receiver")
    p_recv.add_argument("--port", default="/dev/ttyUSB0")
    p_recv.add_argument("--baudrate", type=int, default=115200)
    p_recv.add_argument("--timeout", type=float, default=1.0)
    p_recv.add_argument("--retries", type=int, default=3)
    p_recv.add_argument("--retry-delay", type=float, default=2.0)
    p_recv.add_argument("--output-csv", default="")
    p_recv.add_argument("--quiet", action="store_true")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    setup_logging(args.log_file, debug=args.debug)

    mode = args.mode or "scanner"
    if mode == "scanner":
        return run_scanner_mode(args)
    if mode == "receiver":
        return run_receiver_mode(args)

    parser.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
